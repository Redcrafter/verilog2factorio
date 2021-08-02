import { SignalID } from "../blueprint.js";
import { Arithmetic } from "../entities/Arithmetic.js";
import { Constant } from "../entities/Constant.js";
import { Decider } from "../entities/Decider.js";
import { each, Endpoint, Entity, signalC } from "../entities/Entity.js";
import { Network, Networks } from "./nets.js";

function _changeSignal(e: Endpoint, from: SignalID, to: SignalID) {
    let node = e.entity;

    if (node instanceof Arithmetic) {
        if (e == node.input) {
            if (node.params.first_signal == from) node.params.first_signal = to;
            else if (node.params.second_signal == from) node.params.second_signal = to;
            else console.assert(false);
        } else {
            console.assert(node.params.output_signal == from);
            node.params.output_signal = to;
        }
    } else if (node instanceof Decider) {
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
    }
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
        for (const n of group.nets) {
            this.nets.delete(n);
        }

        for (const net of group.nets) {
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

    function getGroup(s: SignalID) {
        let help = groups.get(s);
        if (!help) {
            help = new GroupCollection();
            groups.set(s, help);
        }

        return help;
    }

    // create all nets
    for (const e of entities) {
        let rNet = nets.red.map.get(e.output);
        let gNet = nets.green.map.get(e.output);

        function procSig(signal: SignalID) {
            let help = getGroup(signal);

            let rGroup = help.nets.get(rNet);
            let gGroup = help.nets.get(gNet);

            let g;
            if (rGroup && gGroup) {
                // merge
                g = help.merge(rGroup, gGroup);

                // somehow rGroup === gGroup is always true
            } else if (rGroup) {
                g = rGroup;
            } else if (gGroup) {
                g = gGroup;
            } else {
                g = new Group();
                help.groups.add(g);
            }

            g.points.add(e.output);
            if (rNet) {
                help.nets.set(rNet, g);
                g.nets.add(rNet);
            }
            if (gNet) {
                help.nets.set(gNet, g);
                g.nets.add(gNet);
            }
        }

        if (e instanceof Constant) {
            for (const s of e.params) {
                procSig(s.signal);
            }
        } else if (e instanceof Arithmetic) {
            procSig(e.params.output_signal);
        } else if (e instanceof Decider) {
            procSig(e.params.output_signal);
        } else {

        }
    }

    // merge input groups with same signal type
    for (const e of entities) {
        if (!(e instanceof Arithmetic || e instanceof Decider)) continue;

        let rNet = nets.red.map.get(e.input);
        let gNet = nets.green.map.get(e.input);

        function doShit(s: SignalID) {
            let help = groups.get(s);

            let rGroup = help.nets.get(rNet);
            let gGroup = help.nets.get(gNet);

            let g;
            if (rGroup && gGroup) {
                g = help.merge(rGroup, gGroup);
            } else {
                g = rGroup ?? gGroup;
            }

            return g;
        }

        // merge all inputs if each
        if (e.params.first_signal == each || e.params.second_signal == each) {
            for (const [s, g] of groups) {
                doShit(s);
            }
        } else {
            // merge if both inputs share a signal
            if (e.params.first_signal) doShit(e.params.first_signal)?.points.add(e.input);
            if (e.params.second_signal) doShit(e.params.second_signal)?.points.add(e.input);

            // merge input and output if passthrough
            if (e instanceof Decider && e.params.copy_count_from_input) {
                let help = groups.get(e.params.output_signal);
                let g = doShit(e.params.output_signal);

                let why = help.nets.get(nets.red.map.get(e.output) ?? nets.green.map.get(e.output));

                help.merge(why, g);
            }
        }
    }

    // console.assert(groups.netMap.size == nets.red.nets.size + nets.green.nets.size);

    return groups;
}