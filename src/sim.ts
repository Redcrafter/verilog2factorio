import { options } from "./options.js";
import { logger } from "./logger.js";

function dist(a: Point, b: Point) {
    const dx = a.x - b.x;
    const dy = (a.y - b.y) * 2; // y counts double because a cell is 2 heigh

    return Math.sqrt(dx * dx + dy * dy);
}

class Point {
    // Position
    x = 0;
    y = 0;

    id: number;

    fixed: boolean;
    connected: Point[] = [];

    constructor(id: number, fixed: boolean) {
        this.id = id;
        this.fixed = fixed;
    }

    getMidPoint() {
        let mx = 0;
        let my = 0;
        for (const o of this.connected) {
            mx += o.x;
            my += o.y;
        }
        return [mx / this.connected.length, my / this.connected.length];
    }

    edgeLength() {
        let v = 0;
        for (const o of this.connected) {
            v += dist(this, o);
        }
        return v;
    }
}

interface Edge {
    a: Point;
    b: Point;
}

export class Simulator {
    public nodes: Point[] = [];
    private edges: Edge[] = [];

    // private compactionDir: boolean;
    private iterationCount: number;
    private T: number;
    private k: number;

    private gridSize: number;
    private grid: Point[];

    constructor() { }

    rand(min: number, max: number) {
        return (Math.random() * (max - min)) + min;
    }

    addNode(fixed: boolean) {
        let n = new Point(this.nodes.length, fixed);
        return this.nodes.push(n) - 1;
    }

    addEdge(a: number, b: number) {
        // node can't connect to itself
        if (a == b) return;

        let an = this.nodes[a];
        let bn = this.nodes[b];

        if (!an || !bn) throw new Error("Invalid node");

        // edge already exists
        if (this.edges.some(x => x.a == an && x.b == bn || x.b == an && x.a == bn)) return;

        an.connected.push(bn);
        bn.connected.push(an);

        this.edges.push({
            a: an,
            b: bn
        });
    }

    sim(errorCallback: (a: number, b: number) => void) {
        let run = true;
        let iter = 0;
        while (run) {
            iter++;

            run = false;
            this.reset();

            for (let i = 0; i < this.iterationCount; i++) {
                this.simStep();
            }

            let errorCount = 0;
            for (const e of this.edges.filter(x => dist(x.a, x.b) > 9)) {
                errorCount++;
                errorCallback(e.a.id, e.b.id);

                // delete edge
                /*e.a.connected.splice(e.a.connected.indexOf(e.b), 1);
                e.b.connected.splice(e.b.connected.indexOf(e.a), 1);
                this.edges.splice(this.edges.indexOf(e), 1);

                // add intermediate node
                let p = this.addNode(false);
                this.addEdge(e.a.id, p);
                this.addEdge(p, e.b.id);*/

                if (options.retry) {
                    run = true;
                }
            }

            logger.log(`Iteration: ${iter} Errors: ${errorCount}`);
        }
    }

    private initBFS() {
        let next: Point[] = [];

        let x = Math.floor(this.gridSize / 2);
        for (const n of this.nodes) {
            if (n.fixed) {
                n.x = x++;

                for (const o of n.connected) {
                    next.push(o);
                }
            } else {
                n.x = -1;
            }
            n.y = -1;
        }

        let y = 0;
        while (next.length > 0) {
            let temp: Point[] = [];
            x = 0;
            for (const n of next) {
                if (n.x != -1) continue;

                n.x = x;
                n.y = y;
                this.setNode(x, y, n);

                for (const asdf of n.connected) {
                    temp.push(asdf);
                }

                x++;
            }
            next = temp;
            y++;
        }
    }

    private initRandom() {
        let x = Math.floor(this.gridSize / 2);

        for (const n of this.nodes) {
            if (n.fixed) {
                n.x = x++;
                n.y = -1;
                continue;
            }

            while (true) {
                let x = Math.floor(this.rand(0, this.gridSize));
                let y = Math.floor(this.rand(0, this.gridSize));

                if (!this.getNode(x, y)) {
                    n.x = x;
                    n.y = y;
                    this.setNode(x, y, n);
                    break;
                }
            }
        }
    }

    private reset() {
        this.gridSize = Math.floor(5 * Math.sqrt(this.nodes.length));
        this.grid = new Array(this.gridSize * this.gridSize);
        // this.initBFS();
        this.initRandom();

        // this.compactionDir = true;
        this.iterationCount = 2000 * Math.sqrt(this.nodes.length);
        this.T = 2 * Math.sqrt(this.nodes.length);
        this.k = (0.2 / this.T) ** (1 / this.iterationCount);
    }

    private simStep() {
        for (const n of this.nodes) {
            if (n.fixed) continue;

            // find optimal place to put node

            const [mx, my] = n.getMidPoint();
            const fx = Math.round(mx + this.rand(-this.T, this.T));
            const fy = Math.round(my + this.rand(-this.T, this.T));

            if (fx < 0 || fx >= this.gridSize || fy < 0 || fy >= this.gridSize)
                continue;

            if (n.x == fx && n.y == fy) {
                // already at position
                // this.swapNeighbor(n);
            } else if (!this.getNode(fx, fy)) {
                // position is empty
                this.setNode(n.x, n.y, null);
                this.setNode(fx, fy, n);
                n.x = fx;
                n.y = fy;
            } else {
                // insertNear(n, fx, fy);
                // currently not doing this because it is expensive
            }
        }

        /*if (step % 9 == 0) {
            compact(compactionDir, 3, false);
            compactionDir = !compactionDir;
        }*/

        this.T *= this.k;
    }

    private swapNeighbor(n: Point) {
        let off = this.randomOffset();

        if (n.x + off.x < 0 || n.x + off.x >= this.gridSize || n.y + off.y < 0 || n.y + off.y >= this.gridSize) return;

        let other = this.getNode(n.x + off.x, n.y + off.y);

        let cost = n.edgeLength();
        if (other) {
            cost += other.edgeLength();

            other.x -= off.x;
            other.y -= off.y;
        }
        n.x += off.x;
        n.y += off.y;

        let newCost = n.edgeLength() + (other?.edgeLength() ?? 0);

        if (newCost < cost) { // graph after swapping is better
            this.setNode(n.x - off.x, n.y - off.y, other);
            this.setNode(n.x, n.y, n);
        } else {
            n.x -= off.x;
            n.y -= off.y

            if (other) {
                other.x += off.x;
                other.y += off.y;
            }
        }
    }

    private randomOffset() {
        switch (Math.floor(Math.random() * 4)) {
            case 0: return { x: 1, y: 0 };
            case 1: return { x: -1, y: 0 };
            case 2: return { x: 0, y: -1 };
            case 3: return { x: 0, y: 1 };
        }
    }

    private getNode(x: number, y: number) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) throw new Error("element out of range");
        return this.grid[x + y * this.gridSize];
    }
    private setNode(x: number, y: number, v: Point) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) throw new Error("element out of range");
        this.grid[x + y * this.gridSize] = v;
    }
}
