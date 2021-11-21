import { logger } from "../logger.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { anything, each, everything } from "../entities/Entity.js";
// todo: make this a virtual function?
function changeCombSignal(endpoint, from, to) {
    let entity = endpoint.entity;
    if (entity instanceof Arithmetic || entity instanceof Decider) {
        if (endpoint == entity.input) {
            if (entity.params.first_signal == from)
                entity.params.first_signal = to;
            else if (entity.params.second_signal == from)
                entity.params.second_signal = to;
            else
                logger.assert(false);
        }
        else {
            if (!isSpecial(entity.params.output_signal)) {
                logger.assert(entity.params.output_signal == from);
                entity.params.output_signal = to;
            }
            endpoint.outSignals.delete(from);
            endpoint.outSignals.add(to);
        }
    }
    else if (entity instanceof Constant) {
        for (const el of entity.params) {
            if (el.signal == from)
                el.signal = to;
        }
        endpoint.outSignals.delete(from);
        endpoint.outSignals.add(to);
    }
    else
        throw new Error(`node is not of type Arithmetic, Decider, or Constant.`);
}
function addToSet(a, b) {
    for (const el of b) {
        a.add(el);
    }
}
export class Group {
    root;
    _parent;
    points = new Set();
    nets = new Set();
    signals = new Set();
    constructor(root, parent) {
        this.root = root;
        this._parent = parent;
    }
    hasSignal(s) { return this.signals.has(s); }
    changeSignal(from, to) {
        this.root.changeSignal(this, from, to);
    }
    add(p) {
        if (p.entity instanceof Arithmetic || p.entity instanceof Decider) {
            if (p == p.entity.output) {
                logger.assert(p.outSignals.has(this._parent.type));
            }
            else {
                logger.assert(p.entity.params.first_signal == this._parent.type || p.entity.params.second_signal == this._parent.type);
            }
        }
        else if (p.entity instanceof Constant) {
            logger.assert(p.outSignals.has(this._parent.type));
        }
        else {
            debugger;
        }
        if (p.red) {
            this.nets.add(p.red);
            this._parent.nets.set(p.red, this);
        }
        if (p.green) {
            this.nets.add(p.green);
            this._parent.nets.set(p.green, this);
        }
        addToSet(this.signals, p.outSignals);
        this.points.add(p);
    }
    remove(p) {
        // don't want to remove nets?
        this.points.delete(p);
        // recalc signals
        this.signals.clear();
        for (const p of this.points) {
            addToSet(this.signals, p.outSignals);
        }
    }
    get parent() { return this._parent; }
    static merge(a, b) {
        logger.assert(a.root == b.root);
        logger.assert(a._parent == b._parent);
        let g = new Group(a.root, a._parent);
        g.points = new Set([...a.points, ...b.points]);
        g.nets = new Set([...a.nets, ...b.nets]);
        g.signals = new Set([...a.signals, ...b.signals]);
        return g;
    }
}
export class GroupCollection {
    groups = new Set();
    nets = new Map();
    type;
    constructor(type) {
        this.type = type;
    }
    addGroup(g) {
        for (const n of g.nets) {
            this.nets.set(n, g);
        }
        this.groups.add(g);
    }
    merge(a, b) {
        if (a === b)
            return a;
        this.groups.delete(a);
        this.groups.delete(b);
        let g = Group.merge(a, b);
        this.addGroup(g);
        return g;
    }
}
function isSpecial(s) {
    return s == anything || s == everything || s == each;
}
export class GroupManager {
    groups = new Map();
    constructor(entities) {
        // create all groups
        for (const entity of entities) {
            for (const s of entity.output.outSignals) {
                let signalGroups = this.getSub(s);
                let rGroup = signalGroups.nets.get(entity.output.red);
                let gGroup = signalGroups.nets.get(entity.output.green);
                let g;
                if (rGroup && gGroup) {
                    g = signalGroups.merge(rGroup, gGroup);
                }
                else if (!rGroup && !gGroup) {
                    g = new Group(this, signalGroups);
                    signalGroups.addGroup(g);
                }
                else {
                    g = rGroup ?? gGroup;
                }
                g.add(entity.output);
            }
        }
        // merge input groups with same signal type
        for (const entity of entities) {
            if (!(entity instanceof Arithmetic || entity instanceof Decider))
                continue;
            let inSigs = [];
            let outSigs = [];
            function add(s) {
                if (!s)
                    return;
                if (isSpecial(s)) {
                    if (entity.input.red)
                        inSigs.push(...entity.input.red.signals);
                    if (entity.input.green)
                        inSigs.push(...entity.input.green.signals);
                }
                else {
                    inSigs.push(s);
                }
            }
            add(entity.params.first_signal);
            add(entity.params.second_signal);
            if (isSpecial(entity.params.output_signal)) {
                outSigs.push(...entity.output.outSignals);
            }
            else if (entity instanceof Decider && entity.params.copy_count_from_input) {
                outSigs.push(entity.params.output_signal);
            }
            inSigs.push(...outSigs);
            let inSet = new Set(inSigs);
            let outSet = new Set(outSigs);
            for (const s of inSet) {
                let inGroup = this.mergeInput(s, entity);
                if (s == entity.params.first_signal ||
                    s == entity.params.second_signal)
                    inGroup?.add(entity.input);
                if (outSet.has(s)) {
                    let outGroup = this.get(s, entity.output.red ?? entity.output.green);
                    this.merge(inGroup, outGroup);
                }
            }
        }
    }
    get(signal, net) {
        return this.groups.get(signal).nets.get(net);
    }
    merge(a, b) {
        logger.assert(a.parent == b.parent);
        return a.parent.merge(a, b);
    }
    changeSignal(group, from, to) {
        logger.assert(group._parent.type == from);
        let a = group.parent;
        let b = this.getSub(to);
        // move group to new set
        a.groups.delete(group);
        b.groups.add(group);
        for (const net of group.nets) {
            // change net association
            a.nets.delete(net);
            b.nets.set(net, group);
            // change signals for nets
            net.signals.delete(from);
            net.signals.add(to);
        }
        // change signal in combinators
        for (const end of group.points) {
            changeCombSignal(end, from, to);
        }
        group._parent = b;
    }
    getSub(signalId) {
        let signal = this.groups.get(signalId);
        if (!signal) {
            signal = new GroupCollection(signalId);
            this.groups.set(signalId, signal);
        }
        return signal;
    }
    mergeInput(signalId, entity) {
        let signalGroups = this.groups.get(signalId);
        let rGroup = signalGroups.nets.get(entity.input.red);
        let gGroup = signalGroups.nets.get(entity.input.green);
        let g;
        if (rGroup && gGroup) {
            g = signalGroups.merge(rGroup, gGroup);
        }
        else {
            g = rGroup ?? gGroup;
        }
        return g;
    }
}
export function extractSignalGroups(entities) {
    return new GroupManager(entities);
}
