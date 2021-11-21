import { SignalID } from "../blueprint.js";
import { anything, each, Endpoint, everything } from "../entities/Entity.js";
import { logger } from "../logger.js";

let redCounter = 1;
let greenCounter = 1;

// TODO: remove global?
export let nets: {
    red: Set<Network>,
    green: Set<Network>
};

export function resetNets() {
    nets = {
        red: new Set<Network>(),
        green: new Set<Network>()
    }
    redCounter = 1;
    greenCounter = 1;
}

export class Network {
    public points = new Set<Endpoint>();
    public id: number;
    public color: "red" | "green";

    public signals = new Set<SignalID>(); // TODO: make signals track producer count

    constructor(color: "red" | "green") {
        this.color = color;

        if (color == "red") {
            this.id = redCounter++;
        } else {
            this.id = greenCounter++;
        }
        nets[color].add(this);
    }

    add(e: Endpoint) {
        if (e[this.color] === this) return;
        if (e[this.color]) logger.assert(false, "cannot add endpoint which is part of a different network");

        this.points.add(e);
        e[this.color] = this;
        if (e.outSignals.has(anything) || e.outSignals.has(everything) || e.outSignals.has(each)) {
            throw new Error("special signal not allowed");
        }
        for (const s of this.signals) {
            e.entity?.netSignalAdd(e, s);
        }
        for (const s of e.outSignals) {
            this.addSignal(s);
        }
    }
    remove(e: Endpoint) {
        if (!this.points.has(e)) debugger;

        this.points.delete(e);

        e[this.color] = null;

        if (this.points.size == 1) {
            this.delete();
            return;
        }
        for (const s of e.outSignals) {
            this.removeSignal(s);
        }
    }
    addSignal(s: SignalID) {
        if (this.signals.has(s)) return;

        this.signals.add(s);
        for (const p of this.points) {
            p.entity?.netSignalAdd(p, s);
        }
    }
    removeSignal(s: SignalID) {
        let has = false;
        for (const p of this.points) {
            if (p.outSignals.has(s)) {
                has = true;
                break;
            }
        }
        if (!has) {
            this.signals.delete(s);
            logger.assert(false, "removeSignal propagation not implemented");
            /* TODO:
            for (const p of this.points) {
                p.entity?.netSignalRemove(p, s);
            }*/
        }
    }

    hasWriter() {
        for (const e of this.points) {
            if (e == e.entity.output && e.outSignals.size != 0) return true;
        }
        return false;
    }

    hasOtherWriters(e: Endpoint) {
        for (const o of this.points) {
            if (e == o || o.outSignals.size == 0 || o == o.entity.input) continue;

            for (const s of e.outSignals) {
                if (o.outSignals.has(s))
                    return true;
            }
        }

        return false;
    }

    hasOtherReaders(e: Endpoint) {
        // TODO: check for signals?
        for (const o of this.points) {
            if (o !== e && o == o.entity.input) return true;
        }

        return false;
    }

    hasOtherColor() {
        let color: "red" | "green" = this.color == "red" ? "green" : "red";
        for (const o of this.points) {
            if (o[color]) return true;
        }

        return false;
    }

    delete() {
        for (const p of this.points) {
            p[this.color] = null;
        }
        this.points.clear();
        nets[this.color].delete(this);
    }

    static merge(a: Network, b: Network) {
        console.assert(a.color == b.color, "Trying to merge different color networks");
        let n = new Network(a.color);

        for (const p of a.points) {
            p[a.color] = null;
            n.add(p);
        }
        for (const p of b.points) {
            p[a.color] = null;
            n.add(p);
        }

        a.points.clear();
        b.points.clear();
        nets[a.color].delete(a);
        nets[a.color].delete(b);

        return n;
    }
}
