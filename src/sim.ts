function dist(a: Point, b: Point) {
    const dx = a.x - b.x;
    const dy = (a.y - b.y) * 2; // you counts double cause 2 heightl

    return Math.sqrt(dx * dx + dy * dy);
}

function rand(min: number, max: number) {
    return (Math.random() * (max - min)) + min;
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
}

interface Edge {
    a: Point;
    b: Point;
}

class Simulator {
    public nodes: Point[] = [];
    private edges: Edge[] = [];

    private compactionDir: boolean;
    private iterationCount: number;
    private T: number;
    private k: number;

    private gridSize: number;
    private grid: Point[];

    addNode(fixed: boolean) {
        let n = new Point(this.nodes.length, fixed);
        return this.nodes.push(n) - 1;
    }

    addEdge(a: number, b: number) {
        if (a == b) return;
        let an = this.nodes[a];
        let bn = this.nodes[b];

        if (!an || !bn) throw new Error("Invalid node")

        if (this.edges.some(x => x.a == an && x.b == bn || x.b == an && x.a == bn)) return;

        an.connected.push(bn);
        bn.connected.push(an);

        this.edges.push({
            a: an,
            b: bn
        });
    }

    private delEdge(e: Edge) {

    }

    sim(errorCallback: (a: number, b: number) => void) {
        let run = true;
        while (run) {
            run = false;
            this.reset();

            for (let i = 0; i < this.iterationCount; i++) {
                this.simStep();
            }

            for (const e of this.edges) {
                let len = dist(e.a, e.b);

                if (len > 9) {
                    errorCallback(e.a.id, e.b.id);
                    /* causes infinite loop
                    this.delEdge(e);

                    let p = this.addNode(false);
                    this.addEdge(e.a.id, p);
                    this.addEdge(p, e.b.id);

                    run = true;*/
                }
            }
        }
    }

    private initBFS() {
        let next = [];

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
            let temp = [];
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
                let x = Math.floor(Math.random() * this.gridSize);
                let y = Math.floor(Math.random() * this.gridSize);

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

        /*for (const n of this.nodes) {
            n.cost = n.getCost();
        }*/

        this.compactionDir = true;
        this.iterationCount = 2000 * Math.sqrt(this.nodes.length);
        this.T = 2 * Math.sqrt(this.nodes.length);
        this.k = (0.2 / this.T) ** (1 / this.iterationCount);
    }

    private simStep() {
        for (const n of this.nodes) {
            if (n.fixed) continue;

            // find optimal place to put node

            const [mx, my] = n.getMidPoint();
            const fx = Math.round(mx + rand(-this.T, this.T));
            const fy = Math.round(my + rand(-this.T, this.T));

            if (fx < 0 || fx >= this.gridSize || fy < 0 || fy >= this.gridSize)
                continue;

            if (n.x == fx && n.y == fy) {
                // swapNeighbor(n);
            } else {
                if (!this.getNode(fx, fy)) {
                    this.setNode(n.x, n.y, null);
                    this.setNode(fx, fy, n);
                    n.x = fx;
                    n.y = fy;
                } else {
                    // insertNear(n, fx, fy);
                }
            }
        }

        this.T *= this.k;
    }

    private getNode(x: number, y: number) {
        return this.grid[x + y * this.gridSize];
    }
    private setNode(x: number, y: number, v: Point) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) throw new Error("element out of range");
        this.grid[x + y * this.gridSize] = v;
    }
}

export { Simulator }
