const repulsion = 4000;
const stiffness = 400;

const attraction = 400;
const damping = 0.5;
const wiggle = 1000;

const dt = 1 / 1000;
const steps = 100000;

function dist(a: Point, b: Point) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function collides(a: Point, b: Point) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

class Point {
    // Position
    x = 0;
    y = 0;

    // Size
    width: number;
    height: number;

    // Velocity
    vx = 0;
    vy = 0;

    // Acceleration
    ax = 0;
    ay = 0;

    fixed = false;

    updatePosition(collidesAny?) {
        this.vx = (this.vx + this.ax * dt) * damping;
        this.vy = (this.vy + this.ay * dt) * damping;

        if (!this.fixed) {
            let ox = this.x;
            let oy = this.y;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            this.x = this.x;
            this.y = Math.max(this.y, 2);

            if (collidesAny) {
                let o = collidesAny(this);
                if (o) {
                    /*o.ax += this.ax / 2;
                    o.ay += this.ay / 2;*/

                    this.y = oy;
                    if (collidesAny(this)) {
                        this.x = ox;
                        this.y = Math.max(oy + this.vy * dt, 2);
                        if (collidesAny(this)) {
                            this.y = oy;
                        }
                    }
                }
            }
        }

        this.ax = (Math.random() - 0.5) * wiggle;
        this.ay = (Math.random() - 0.5) * wiggle;

        if (isNaN(this.x) || isNaN(this.y)) {
            debugger;
        }
    }
}

interface Edge {
    a: Point;
    b: Point;
}

class Simulator {
    nodes: Point[] = [];
    private edges: Edge[] = [];

    addNode(x = 0, y = 0, width = 1, height = 1, fixed = false) {
        let n = new Point();

        n.x = x;
        n.y = y;
        n.width = width;
        n.height = height;
        n.fixed = fixed;

        return this.nodes.push(n) - 1;
    }

    addEdge(a: number, b: number) {
        if (a == b) return;
        let an = this.nodes[a];
        let bn = this.nodes[b];

        if (!an || !bn) throw new Error("Invalid node")

        if (this.edges.some(x => x.a == an && x.b == bn || x.b == an && x.a == bn)) return;

        this.edges.push({
            a: an,
            b: bn
        });
    }

    sim() {
        let changed = true;
        while (changed) {
            changed = false;

            // normal graph layout
            for (let i = 0; i < steps; i++) {
                this.step1();
            }

            { 
                // align to grid
                for (const n of this.nodes) {
                    n.x = Math.floor(n.x);
                    n.y = Math.floor(n.y);
                }

                // resolve collisions
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const n of this.nodes) {
                        if (this.collidesAny(n)) {
                            n.x++;
                            changed = true;
                        }
                    }
                }
            }

            // pull everything together
            for (let i = 0; i < steps; i++) {
                this.step2();
            }

            for (const c of this.edges) {
                let d = dist(c.a, c.b);
                if (d > 9) {
                    // TODO: split edge
                    // throw new Error("Not implemented");
                    // changed = true;
                }
            }
        }
    }

    private collidesAny(a: Point) {
        for (const b of this.nodes) {
            if (a == b) continue;

            if (collides(a, b)) {
                return b;
            }
        }

        return null;
    }

    private step1() {
        // move away from everyone
        for (const a of this.nodes) {
            for (const b of this.nodes) {
                let dx = a.x - b.x;
                let dy = a.y - b.y;

                if (Math.abs(dx) < 1 || Math.abs(dy) < 2) {
                    // distance squared, add to avoid / 0
                    let dist = dx * dx + dy * dy;

                    dist = repulsion / (dist + 0.01);
                    a.ax += dx * dist;
                    a.ay += dy * dist;
                }
            }
        }

        // spring to connections
        for (const c of this.edges) {
            let d = (3 - dist(c.a, c.b)) * stiffness;
            let dx = (c.a.x - c.b.x) * d;
            let dy = (c.a.y - c.b.y) * d;

            c.a.ax += dx;
            c.a.ay += dy;

            c.b.ax -= dx;
            c.b.ay -= dy;
        }

        for (const n of this.nodes) {
            n.updatePosition();
        }
    }

    private step2() {
        for (const a of this.nodes) {
            // attract to center
            a.ax -= a.x * 100;
            a.ay -= 100;
        }

        // pull to connections
        for (const c of this.edges) {
            let dx = c.b.x - c.a.x;
            let dy = c.b.y - c.a.y;

            let dist = (dx * dx + dy * dy) / 100 * attraction;

            dx *= dist;
            dy *= dist;

            c.a.ax += dx;
            c.a.ay += dy;

            c.b.ax -= dx;
            c.b.ay -= dy;
        }

        let f = this.collidesAny.bind(this)
        for (const n of this.nodes) {
            n.updatePosition(f);
        }
    }
}

export { Simulator }
