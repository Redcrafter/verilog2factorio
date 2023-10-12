
import { Constant } from "../entities/Constant.js";
import { Color, Endpoint, Entity } from "../entities/Entity.js";
import { nets, Network } from "../nets.js";

interface El {
    min: number;
    max: number;
    score: number;
    points: number[];
    net: Network;
}

function overlaps(list: El[], inter: El) {
    for (let i = 0; i < list.length; i++) {
        const el = list[i];
        if (inter.min <= el.max && el.min <= inter.max) return true;
    }
    return false;
}

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

    let grid: Constant[][] = [];
    let newCombs = [];

    let intervals: El[] = [];
    for (const n of [...nets.red, ...nets.green]) {
        let points = [...n.points].map(x => x.entity.id - 1);
        points.sort((a, b) => a - b);

        let min = points[0];
        let max = points[points.length - 1];
        let len = points[points.length - 1] - points[0];

        intervals.push({
            min, max,
            score: len / points.length,
            points,
            net: n
        });
    }
    intervals.sort((a, b) => a.score - b.score);

    let lines = [];

    function stringPoles(el: El, x: number) {
        // using the network id to determine connection point x
        el.net.id = x;

        let points = el.points;

        // align to grid
        let gridX = x + Math.floor(x / 8) * 2 + 1.5;

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
            p.x = gridX;
            p.y = nextY;

            newCombs.push(p);
            grid[x][nextY] = p;
            if (last) connect(el.net.color == "red" ? Color.Red : Color.Green, last.output, p.output);
            last = p;
            lastY = nextY;
        }
    }

    for (let i = 0; i < intervals.length; i++) {
        const el = intervals[i];

        // try to insert
        let j = 0;
        for (; j < lines.length; j++) {
            if (!overlaps(lines[j], el)) {
                stringPoles(el, j);
                lines[j].push(el);
                break;
            }
        }
        if (j == lines.length) {
            // failed to insert, create new line
            grid.push([]);
            stringPoles(el, lines.length);
            lines.push([el]);
        }
    }

    for (let i = 0; i < combs.length; i++) {
        const item = combs[i];
        item.x = 0;
        item.y = i;
        item.dir = 2;

        let inPoles = [item];
        let outPoles = [item];

        let lastIn = item.input;
        let lastOut = item.output;

        let needed = Math.max(item.input.red?.id ?? -1, item.input.green?.id ?? -1) / 8;
        let inCol = (item.input.red ? Color.Red : 0) | (item.input.green ? Color.Green : 0);
        for (let j = 1; j <= needed; j++) {
            let a = new Constant();
            a.isOn = false;
            newCombs.push(a);
            inPoles.push(a);
            a.x = j * 10 - 0.5;
            a.y = i;
            connect(inCol, lastIn, a.input);
            lastIn = a.input;
        }

        needed = Math.max(item.output?.red?.id ?? -1, item.output?.green?.id ?? -1) / 8;
        let outCol = (item.output.red ? Color.Red : 0) | (item.output.green ? Color.Green : 0);
        for (let j = 1; j <= needed; j++) {
            let b = new Constant();
            b.isOn = false;
            newCombs.push(b);
            outPoles.push(b);
            b.x = j * 10 + 0.5;
            b.y = i;
            connect(outCol, lastOut, b.output);
            lastOut = b.output;
        }

        if (item.input.red) {
            let p = grid[item.input.red.id][i];
            connect(Color.Red, p.output, inPoles[Math.floor(item.input.red.id / 8)].input);
        }
        if (item.input.green) {
            let p = grid[item.input.green.id][i];
            connect(Color.Green, p.output, inPoles[Math.floor(item.input.green.id / 8)].input);
        }

        if (item.output.red) {
            let p = grid[item.output.red.id][i];
            connect(Color.Red, p.output, outPoles[Math.floor(item.output.red.id / 8)].output);
        }
        if (item.output.green) {
            let p = grid[item.output.green.id][i];
            connect(Color.Green, p.output, outPoles[Math.floor(item.output.green.id / 8)].output);
        }
    }

    for (const c of newCombs) {
        combs.push(c);
    }
}
