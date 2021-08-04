export class Network {
    points;
    id = -1;
    _signals;
    constructor(points) {
        this.points = new Set(points);
    }
    hasOtherInputs(e) {
        for (const o of this.points) {
            if (e == o || o.outSignals.size == 0)
                continue;
            for (const s of e.outSignals) {
                if (o.outSignals.has(s))
                    return true;
            }
        }
        return false;
    }
    hasOtherOutputs(e) {
        for (const o of this.points) {
            if (o !== e && o.outSignals.size == 0)
                return true;
        }
        return false;
    }
    hasColor(color) {
        for (const o of this.points) {
            if (o[color].size != 0)
                return true;
        }
        return false;
    }
    get signals() {
        if (!this._signals) {
            this._signals = new Set();
            for (const p of this.points) {
                for (const s of p.outSignals) {
                    this._signals.add(s);
                }
            }
        }
        return this._signals;
    }
}
export function extractNets(entities) {
    let networks = {
        red: {
            nets: new Set(),
            map: new Map()
        },
        green: {
            nets: new Set(),
            map: new Map()
        }
    };
    function addColor(endpoint, color) {
        const other = endpoint[color];
        if (other.size == 0)
            return null;
        let colorNet = networks[color];
        let connected = new Set([...other].map(x => colorNet.map.get(x)));
        connected.delete(undefined);
        let net;
        if (connected.size == 0) {
            // make new
            net = new Network([endpoint]);
            colorNet.map.set(endpoint, net);
            colorNet.nets.add(net);
        }
        else if (connected.size == 1) {
            // add
            net = connected.values().next().value;
            net.points.add(endpoint);
            colorNet.map.set(endpoint, net);
        }
        else {
            let points = [endpoint];
            for (const n of connected) {
                points.push(...n.points);
                // neighbors.push(...n.neighbors);
                colorNet.nets.delete(n);
            }
            net = new Network(points);
            for (const p of points) {
                colorNet.map.set(p, net);
            }
            colorNet.nets.add(net);
        }
    }
    // insert entities and assign entity id's
    for (let i = 0; i < entities.length; i++) {
        let entity = entities[i];
        addColor(entity.input, "red");
        addColor(entity.input, "green");
        if (entity.output != entity.input) {
            addColor(entity.output, "red");
            addColor(entity.output, "green");
        }
        ;
        entities[i].id = i + 1;
    }
    let i = 1;
    for (const n of [...networks.red.nets, ...networks.green.nets]) {
        n.id = i++;
    }
    return networks;
}
