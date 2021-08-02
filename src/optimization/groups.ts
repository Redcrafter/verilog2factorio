import { SignalID } from "../blueprint.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { each, Endpoint, Entity, signalC } from "../entities/Entity.js";
import { Network, Networks } from "./nets.js";

function _changeSignal(e: Endpoint, from: SignalID, to: SignalID) {
    let node = e.entity;

    if (node instanceof Arithmetic || node instanceof Decider) {
        if (e == node.input) {
            if (node.params.first_signal == from) node.params.first_signal = to;
            else if (node.params.second_signal == from) node.params.second_signal = to;
            else console.assert(false);
        } else {
            console.assert(node.params.output_signal == from);
            node.params.output_signal = to;
        }
    } else if (node instanceof Constant) {
        for (const el of node.params) {
            if (el.signal == from) {
                el.signal = to;
            }
        }
    } else throw new Error(`node is not of type Arithmetic, Decider, or Constant.`)
}

export class Group {
    points = new Set<Endpoint>();
    nets = new Set<Network>();

    _signals: Set<SignalID>;

    static merge(a: Group, b: Group) {
        let g = new Group();
        g.points = new Set([...a.points, ...b.points]);
        g.nets = new Set([...a.nets, ...b.nets]);
        return g;
    }

    get networkSignals() {
        if (!this._signals) {
            this._signals = new Set();
            for (const n of this.nets) {
                for (const signal of n.signals) {
                    this._signals.add(signal);
                }
            }
        }

        return this._signals;
    }
}

export class GroupCollection {
    groups = new Set<Group>();
    nets = new Map<Network, Group>();

    constructor() { }

    merge(a: Group, b: Group) {
        if (a === b) return a;

        this.groups.delete(a);
        this.groups.delete(b);

        let g = Group.merge(a, b);

        for (const n of g.nets) {
            this.nets.set(n, g);
        }

        this.groups.add(g);

        return g;
    }

    changeSignal(group: Group, from: SignalID, to: SignalID) {
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

export function extractSignalGroups(entities: Entity[], nets: Networks) {
    let groups = new Map<SignalID, GroupCollection>();

    function getGroup(signalId: SignalID) {
        let signal = groups.get(signalId);
        if (!signal) {
            signal = new GroupCollection();
            groups.set(signalId, signal);
        }

        return signal;
    }

    // create all nets
    for (const entity of entities) {
        let rNet = nets.red.map.get(entity.output);
        let gNet = nets.green.map.get(entity.output);

        function processSignal(signal: SignalID) {
            let signalGroup = getGroup(signal);

            let rGroup = signalGroup.nets.get(rNet);
            let gGroup = signalGroup.nets.get(gNet);

            let g;
            if (rGroup && gGroup) {
                // merge
                g = signalGroup.merge(rGroup, gGroup);

                // somehow rGroup === gGroup is always true
            } else {
                 g = rGroup ?? gGroup
            }
            
            if (!g) {
                g = new Group();
                signalGroup.groups.add(g);
            }

            g.points.add(entity.output);
            if (rNet) {
                signalGroup.nets.set(rNet, g);
                g.nets.add(rNet);
            }
            if (gNet) {
                signalGroup.nets.set(gNet, g);
                g.nets.add(gNet);
            }
        }

        if (entity instanceof Constant) {
            for (const s of entity.params) {
                processSignal(s.signal);
            }
        } else if (entity instanceof Arithmetic || entity instanceof Decider) {
            processSignal(entity.params.output_signal);
        } else {}
    }

    // merge input groups with same signal type
    for (const entity of entities) {
        if (!(entity instanceof Arithmetic || entity instanceof Decider)) continue;

        let rNet = nets.red.map.get(entity.input);
        let gNet = nets.green.map.get(entity.input);

        function doShit(signalId: SignalID) {
            let signalGroup = groups.get(signalId);

            let rGroup = signalGroup.nets.get(rNet);
            let gGroup = signalGroup.nets.get(gNet);

            let g;
            if (rGroup && gGroup) {
                g = signalGroup.merge(rGroup, gGroup);
            } else {
                g = rGroup ?? gGroup;
            }

            return g;
        }

        // merge all inputs if each
        if (entity.params.first_signal == each || entity.params.second_signal == each) {
            for (const [s, g] of groups) {
                doShit(s);
            }
        } else {
            // merge if both inputs share a signal
            if (entity.params.first_signal) doShit(entity.params.first_signal)?.points.add(entity.input);
            if (entity.params.second_signal) doShit(entity.params.second_signal)?.points.add(entity.input);

            // merge input and output if passthrough
            if (entity instanceof Decider && entity.params.copy_count_from_input) {
                let help = groups.get(entity.params.output_signal);
                let g = doShit(entity.params.output_signal);

                let why = help.nets.get(nets.red.map.get(entity.output) ?? nets.green.map.get(entity.output));

                help.merge(why, g);
            }
        }
    }

    // console.assert(groups.netMap.size == nets.red.nets.size + nets.green.nets.size);

    return groups;
}