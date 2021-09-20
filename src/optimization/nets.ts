import { SignalID } from "../blueprint.js";
import { Endpoint } from "../entities/Entity.js";

let idCounter = 1;
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
    idCounter = 1;
}

export class Network {
    public points = new Set<Endpoint>();
    public id: number;
    public color: "red" | "green";

    private _signals = new Set<SignalID>();
    private dirtySignals = false;

    constructor(color: "red" | "green") {
        this.color = color;

        this.id = idCounter++;
        nets[color].add(this);
    }

    add(e: Endpoint) {
        if (e[this.color] === this) return;
        if (e[this.color]) debugger; // should not happen

        this.points.add(e);
        e[this.color] = this;
        for (const s of e.outSignals) {
            this._signals.add(s);
        }
    }

    remove(e: Endpoint) {
        if (!this.points.has(e)) debugger;

        this.points.delete(e);

        e[this.color] = null;

        if (this.points.size == 1) {
            for (const p of this.points) {
                p[this.color] = null;
            }
            nets[this.color].delete(this);
        }

        if (e.outSignals.size != 0) this.dirtySignals = true;
    }

    hasOtherInputs(e: Endpoint) {
        for (const o of this.points) {
            if (e == o || o.outSignals.size == 0) continue;

            for (const s of e.outSignals) {
                if (o.outSignals.has(s))
                    return true;
            }
        }

        return false;
    }

    hasOtherOutputs(e: Endpoint) {
        for (const o of this.points) {
            if (o !== e && o.outSignals.size == 0) return true;
        }

        return false;
    }

    hasColor(color: "red" | "green") {
        for (const o of this.points) {
            if (o[color]) return true;
        }

        return false;
    }

    get signals() {
        if (this.dirtySignals) {
            this._signals.clear();
            for (const p of this.points) {
                for (const s of p.outSignals) {
                    this._signals.add(s);
                }
            }
        }
        return this._signals;
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
