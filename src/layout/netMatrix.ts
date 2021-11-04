
import { Constant } from "../entities/Constant.js";
import { Color, Endpoint, Entity } from "../entities/Entity.js";
import { nets } from "../optimization/nets.js";

export function createMatrixLayout(combs: Entity[], ports: Set<Entity>) {
    function connect(c: Color, a: Endpoint, b: Endpoint) {
        if (c & Color.Red) {
            a.redP.add(b);
            b.redP.add(a);
        }
        if (c & Color.Green) {
            a.greenP.add(b);
            b.greenP.add(a);
        }
    }

    // reassign network id's
    let i = 0;
    for (const el of nets.red) {
        el.id = i++;
    }
    i = 0;
    for (const el of nets.green) {
        el.id = i++;
    }

    let grid = [];
    let newCombs = [];

    let count = Math.max(nets.red.size, nets.green.size);

    let rNets = [...nets.red];
    let gNets = [...nets.green];
    let x = 3.5;
    for (let i = 0; i < count; i++) {
        let sub = [];

        let r = rNets[i];
        let g = gNets[i];

        let min = Infinity;
        let max = 0;
        let points = [];

        if (r) {
            for (const p of r.points) {
                min = Math.min(min, p.entity.id - 1);
                max = Math.max(max, p.entity.id - 1);
                points.push(p.entity.id - 1);
            }
        }
        if (g) {
            for (const p of g.points) {
                min = Math.min(min, p.entity.id - 1);
                max = Math.max(max, p.entity.id - 1);
                points.push(p.entity.id - 1);
            }
        }
        points.sort((a, b) => a - b);

        // debugger;
        let last = null;
        let lastY = points[0] - 1;
        let j = 0;

        while (j < points.length) {
            let pos = points[j];
            if (pos == lastY) {
                j++;
                continue;
            }
            if (pos - lastY <= 9) j++;
            let nextY = lastY + Math.min(9, pos - lastY);

            let p = new Constant();
            p.isOn = false;
            p.x = x;
            p.y = nextY;

            newCombs.push(p);
            sub[nextY] = p;
            if (last) connect(Color.Both, last.output, p.output);
            last = p;
            lastY = nextY;
        }

        x++
        if (i % 7 == 6) {
            x += 2;
        }

        grid.push(sub);
    }

    for (let i = 0; i < combs.length; i++) {
        const item = combs[i];
        item.x = 0;
        item.y = i;
        item.dir = 2;

        let inPoles = [];
        let outPoles = [];

        let lastIn = item.input;
        let lastOut = item.output;

        let needed = Math.max(item.input?.red?.id ?? -1, item.input?.green?.id ?? -1) / 7;
        for (let j = 0; j <= needed; j++) {
            let a = new Constant();
            a.isOn = false;
            newCombs.push(a);
            inPoles.push(a);
            a.x = j * 9 + 1.5;
            a.y = i;
            connect(Color.Both, lastIn, a.output);
            lastIn = a.output;

        }

        needed = Math.max(item.output?.red?.id ?? -1, item.output?.green?.id ?? -1) / 7;
        for (let j = 0; j <= needed; j++) {
            let b = new Constant();
            b.isOn = false;
            newCombs.push(b);
            outPoles.push(b);
            b.x = j * 9 + 2.5;
            b.y = i;
            connect(Color.Both, lastOut, b.output);
            lastOut = b.output;
        }

        if (item.input.red) {
            let p = grid[item.input.red.id][i];
            connect(Color.Red, p.output, inPoles[Math.floor(item.input.red.id / 7)].output);
        }
        if (item.input.green) {
            let p = grid[item.input.green.id][i];
            connect(Color.Green, p.output, inPoles[Math.floor(item.input.green.id / 7)].output);
        }

        if (item.output.red) {
            let p = grid[item.output.red.id][i];
            connect(Color.Red, p.output, outPoles[Math.floor(item.output.red.id / 7)].output);
        }
        if (item.output.green) {
            let p = grid[item.output.green.id][i];
            connect(Color.Green, p.output, outPoles[Math.floor(item.output.green.id / 7)].output);
        }
    }

    for (const c of newCombs) {
        combs.push(c);
    }
}
