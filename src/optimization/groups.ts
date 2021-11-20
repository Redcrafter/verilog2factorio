import { SignalID } from "../blueprint.js";
import { logger } from "../logger.js";

import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { anything, each, Endpoint, Entity, everything } from "../entities/Entity.js";

import { Network } from "./nets.js";

// todo: make this a virtual function?
function changeCombSignal(endpoint: Endpoint, from: SignalID, to: SignalID) {
    let entity = endpoint.entity;

    if (entity instanceof Arithmetic || entity instanceof Decider) {
        if (endpoint == entity.input) {
            if (entity.params.first_signal == from) entity.params.first_signal = to;
            else if (entity.params.second_signal == from) entity.params.second_signal = to;
            else logger.assert(false);
        } else {
            if (entity.params.output_signal !== each && entity.params.output_signal !== everything && entity.params.output_signal !== anything) {
                logger.assert(entity.params.output_signal == from);
                entity.params.output_signal = to;
            }

            endpoint.outSignals.delete(from);
            endpoint.outSignals.add(to);
        }
    } else if (entity instanceof Constant) {
        for (const el of entity.params) {
            if (el.signal == from) el.signal = to;
        }
        endpoint.outSignals.delete(from);
        endpoint.outSignals.add(to);
    } else throw new Error(`node is not of type Arithmetic, Decider, or Constant.`);
}

function addToSet<T>(a: Set<T>, b: Set<T>) {
    for (const el of b) {
        a.add(el);
    }
}

export class Group {
    private root: GroupManager;
    public _parent: GroupCollection;

    public points = new Set<Endpoint>();
    public nets = new Set<Network>();
    public signals = new Set<SignalID>();

    constructor(root: GroupManager, parent: GroupCollection) {
        this.root = root;
        this._parent = parent;
    }

    hasSignal(s: SignalID) { return this.signals.has(s); }
    changeSignal(from: SignalID, to: SignalID) {
        this.root.changeSignal(this, from, to);
    }

    add(p: Endpoint) {
        if (p.entity instanceof Arithmetic || p.entity instanceof Decider) {
            if (p == p.entity.output) {
                logger.assert(p.outSignals.has(this._parent.type));
            } else {
                logger.assert(p.entity.params.first_signal == this._parent.type || p.entity.params.second_signal == this._parent.type);
            }
        } else if (p.entity instanceof Constant) {
            logger.assert(p.outSignals.has(this._parent.type));
        } else {
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
    remove(p: Endpoint) {
        // don't want to remove nets?
        this.points.delete(p);

        // recalc signals
        this.signals.clear();
        for (const p of this.points) {
            addToSet(this.signals, p.outSignals);
        }
    }

    get parent() { return this._parent; }

    static merge(a: Group, b: Group) {
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
    groups = new Set<Group>();
    nets = new Map<Network, Group>();
    type: SignalID;

    constructor(type: SignalID) {
        this.type = type;
    }

    addGroup(g: Group) {
        for (const n of g.nets) {
            this.nets.set(n, g);
        }
        this.groups.add(g);
    }

    merge(a: Group, b: Group) {
        if (a === b) return a;

        this.groups.delete(a);
        this.groups.delete(b);

        let g = Group.merge(a, b);
        this.addGroup(g);
        return g;
    }
}

export class GroupManager {
    private groups = new Map<SignalID, GroupCollection>();

    constructor(entities: Entity[]) {
        // create all groups
        for (const entity of entities) {
            for (const s of entity.output.outSignals) {
                let signalGroups = this.getSub(s);

                let rGroup = signalGroups.nets.get(entity.output.red);
                let gGroup = signalGroups.nets.get(entity.output.green);

                let g;
                if (rGroup && gGroup) {
                    g = signalGroups.merge(rGroup, gGroup);
                } else if (!rGroup && !gGroup) {
                    g = new Group(this, signalGroups);
                    signalGroups.addGroup(g);
                } else {
                    g = rGroup ?? gGroup;
                }

                g.add(entity.output);
            }
        }

        // merge input groups with same signal type
        for (const entity of entities) {
            if (!(entity instanceof Arithmetic || entity instanceof Decider)) continue;

            if (entity.params.output_signal == each || entity.params.output_signal == anything || entity.params.output_signal == everything) {
                for (const s of entity.output.outSignals) {
                    let inGroup = this.mergeInput(s, entity);
                    if (s == entity.params.first_signal || s == entity.params.second_signal) inGroup.add(entity.input);

                    let outGroup = this.get(s, entity.output.red ?? entity.output.green);
                    this.merge(inGroup, outGroup);
                }
            } else if (entity.params.first_signal == anything || entity.params.second_signal == anything ||
                entity.params.first_signal == everything || entity.params.second_signal == everything) {
                debugger;
                logger.assert(false);
            } else if (entity.params.first_signal == each || entity.params.second_signal == each) {
                // merge all inputs if each
                for (const [s, g] of this.groups) {
                    this.mergeInput(s, entity);
                }
            } else {
                // merge if both inputs share a signal
                if (entity.params.first_signal) this.mergeInput(entity.params.first_signal, entity)?.add(entity.input);
                if (entity.params.second_signal) this.mergeInput(entity.params.second_signal, entity)?.add(entity.input);

                // merge input and output if passthrough
                if (entity instanceof Decider && entity.params.copy_count_from_input) {
                    // memrge inputs by output signal
                    let g = this.mergeInput(entity.params.output_signal, entity);
                    logger.assert(!!g);

                    // outputs are already merged
                    let outGroup = this.get(entity.params.output_signal, entity.output.red ?? entity.output.green);
                    this.merge(outGroup, g);
                }
            }
        }
    }

    get(signal: SignalID, net: Network) {
        return this.groups.get(signal).nets.get(net);
    }

    merge(a: Group, b: Group) {
        logger.assert(a.parent == b.parent);
        return a.parent.merge(a, b);
    }
    changeSignal(group: Group, from: SignalID, to: SignalID) {
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

    private getSub(signalId: SignalID) {
        let signal = this.groups.get(signalId);
        if (!signal) {
            signal = new GroupCollection(signalId);
            this.groups.set(signalId, signal);
        }

        return signal;
    }
    private mergeInput(signalId: SignalID, entity: Entity) {
        let signalGroups = this.groups.get(signalId);

        let rGroup = signalGroups.nets.get(entity.input.red);
        let gGroup = signalGroups.nets.get(entity.input.green);

        let g;
        if (rGroup && gGroup) {
            g = signalGroups.merge(rGroup, gGroup);
        } else {
            g = rGroup ?? gGroup;
        }

        return g;
    }
}

export function extractSignalGroups(entities: Entity[]) {
    return new GroupManager(entities);
}
