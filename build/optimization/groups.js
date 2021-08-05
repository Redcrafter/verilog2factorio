import { logger } from "../logger.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { each } from "../entities/Entity.js";
function _changeSignal(endpoint, from, to) {
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
            logger.assert(entity.params.output_signal == from);
            entity.params.output_signal = to;
        }
    }
    else if (entity instanceof Constant) {
        for (const el of entity.params) {
            if (el.signal == from)
                el.signal = to;
        }
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
    points = new Set();
    nets = new Set();
    _signals;
    static merge(a, b) {
        let g = new Group();
        g.points = new Set([...a.points, ...b.points]);
        g.nets = new Set([...a.nets, ...b.nets]);
        return g;
    }
    get networkSignals() {
        if (!this._signals) {
            this._signals = new Set();
            for (const n of this.nets) {
                for (const p of n.points) {
                    addToSet(this._signals, p.outSignals);
                    if (p.entity instanceof Decider && p.entity.params.copy_count_from_input) {
                        this._signals.add(p.entity.params.output_signal);
                    }
                }
            }
        }
        return this._signals;
    }
}
export class GroupCollection {
    groups = new Set();
    nets = new Map();
    constructor() { }
    merge(a, b) {
        if (a === b)
            return a;
        this.groups.delete(a);
        this.groups.delete(b);
        let g = Group.merge(a, b);
        for (const n of g.nets) {
            this.nets.set(n, g);
        }
        this.groups.add(g);
        return g;
    }
    changeSignal(group, from, to) {
        this.groups.delete(group);
        for (const net of group.nets) {
            this.nets.delete(net);
            net.signals.delete(from);
            net.signals.add(to);
        }
        for (const end of group.points) {
            end.outSignals.delete(from);
            end.outSignals.add(to);
            _changeSignal(end, from, to);
        }
    }
}
export function extractSignalGroups(entities, nets) {
    let groups = new Map();
    function getGroup(signalId) {
        let signal = groups.get(signalId);
        if (!signal) {
            signal = new GroupCollection();
            groups.set(signalId, signal);
        }
        return signal;
    }
    // create all groups
    for (const entity of entities) {
        let rNet = nets.red.map.get(entity.output);
        let gNet = nets.green.map.get(entity.output);
        function processSignal(signal) {
            let signalGroups = getGroup(signal);
            let rGroup = signalGroups.nets.get(rNet);
            let gGroup = signalGroups.nets.get(gNet);
            let g;
            if (rGroup && gGroup) {
                // merge
                g = signalGroups.merge(rGroup, gGroup);
                // somehow rGroup === gGroup is always true
            }
            else {
                g = rGroup ?? gGroup;
            }
            if (!g) {
                g = new Group();
                signalGroups.groups.add(g);
            }
            g.points.add(entity.output);
            if (rNet) {
                signalGroups.nets.set(rNet, g);
                g.nets.add(rNet);
            }
            if (gNet) {
                signalGroups.nets.set(gNet, g);
                g.nets.add(gNet);
            }
        }
        if (entity instanceof Constant) {
            for (const s of entity.params) {
                processSignal(s.signal);
            }
        }
        else if (entity instanceof Arithmetic || entity instanceof Decider) {
            processSignal(entity.params.output_signal);
        }
    }
    // merge input groups with same signal type
    for (const entity of entities) {
        if (!(entity instanceof Arithmetic || entity instanceof Decider))
            continue;
        let rNet = nets.red.map.get(entity.input);
        let gNet = nets.green.map.get(entity.input);
        function mergeInput(signalId) {
            let signalGroups = groups.get(signalId);
            let rGroup = signalGroups.nets.get(rNet);
            let gGroup = signalGroups.nets.get(gNet);
            let g;
            if (rGroup && gGroup) {
                g = signalGroups.merge(rGroup, gGroup);
            }
            else {
                g = rGroup ?? gGroup;
            }
            return g;
        }
        // merge all inputs if each
        if (entity.params.first_signal == each || entity.params.second_signal == each) {
            for (const [s, g] of groups) {
                mergeInput(s);
            }
        }
        else {
            // merge if both inputs share a signal
            if (entity.params.first_signal)
                mergeInput(entity.params.first_signal)?.points.add(entity.input);
            if (entity.params.second_signal)
                mergeInput(entity.params.second_signal)?.points.add(entity.input);
            // merge input and output if passthrough
            if (entity instanceof Decider && entity.params.copy_count_from_input) {
                let signalGroups = groups.get(entity.params.output_signal);
                let g = mergeInput(entity.params.output_signal);
                let why = signalGroups.nets.get(nets.red.map.get(entity.output) ?? nets.green.map.get(entity.output));
                if (g)
                    signalGroups.merge(why, g);
            }
        }
    }
    return groups;
}
