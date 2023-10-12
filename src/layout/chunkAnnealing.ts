import { Endpoint, Entity } from "../entities/Entity.js";
import { SteelChest } from "../entities/SteelChest.js";
import { Substation } from "../entities/Substation.js";
import { Network, nets } from "../nets.js";
import { RNG } from "../random.js";

let combRange = [[-10, 0], [-10, 1], [-9, 2], [-9, 3], [-9, 4], [-9, 5], [-8, 6], [-7, 7], [-6, 8], [-5, 9], [-1, 10]];
let rangeSet = new Set();
{
    let len = combRange.length;
    for (let i = 0; i < len; i++) {
        let item = combRange[i];

        for (let j = item[0] + 1; j < 0; j++) {
            combRange.push([j, item[1]]);
        }
    }
    len = combRange.length;
    for (let i = 0; i < len; i++) {
        let item = combRange[i];

        combRange.push([- item[1], + item[0]]);
        combRange.push([- item[0], - item[1]]);
        combRange.push([+ item[1], - item[0]]);
    }

    for (const [x, y] of combRange) {
        rangeSet.add(x + y * 21);
    }
}

interface Vec2 {
    x: number;
    y: number;
}

function dist(a: Vec2, b: Vec2) {
    const dx = a.x - b.x;
    const dy = (a.y - b.y) * 2; // y counts double because a cell is 2 high

    return Math.sqrt(dx * dx + dy * dy);
}

function hasClose(c: Entity, net: Network) {
    if (!net)
        return 0;

    for (const o of net.points) {
        if (c != o.entity && dist(c, o.entity) < 9)
            return 0;
    }

    return 1;
}

function countLong(comb: Entity) {
    let c = 0;
    c += hasClose(comb, comb.input.red);
    c += hasClose(comb, comb.input.green);
    if (comb.input != comb.output) {
        c += hasClose(comb, comb.output.red);
        c += hasClose(comb, comb.output.green);
    }

    return c;
}

function getPoints(n: Entity): Vec2[] {
    if (n.height == 1) {
        return [{ x: n.x, y: n.y }];
    } else if (n.height == 2) {
        return [
            { x: n.x, y: n.y },
            { x: n.x, y: n.y + 1 }
        ];
    } else {
        throw new Error("unexpected");
    }
}


/**
 * Builds a Minimum spanning tree using Prim's algorithm
 * @returns all connections that are too long for normal wires
 */
function opt_conn(combs: Entity[]) {
    function dist(a: Endpoint, b: Endpoint) {
        const dx = a.entity.x - b.entity.x;
        const dy = a.entity.y - b.entity.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    let errors: {
        from: Endpoint,
        to: Endpoint,
        color: "redP" | "greenP"
    }[] = [];
    function connectColor(nets: Set<Network>, asd: "redP" | "greenP") {
        for (const n of nets) {
            let visited: Endpoint[] = [];
            let todo = new Set(n.points);

            visited.push(todo.values().next().value);
            todo.delete(visited[0]);

            while (todo.size > 0) {
                let from: Endpoint = null;
                let to: Endpoint = null;
                let d = Infinity;

                for (const a of visited) {
                    for (const b of todo) {
                        let d_ = dist(a, b);
                        if (d_ < d) {
                            d = d_;
                            from = a;
                            to = b;
                        }
                    }
                }

                if (d > 9) {
                    errors.push({
                        from,
                        to,
                        color: asd
                    });
                } else {
                    from[asd].add(to);
                    to[asd].add(from);
                }
                todo.delete(to);
                visited.push(to);
            }
        }
    }
    connectColor(nets.red, "redP");
    connectColor(nets.green, "greenP");

    // console.log(errors.length);

    return errors;
}

// Breadth-first path finding
function pathFind(start: Vec2[], end: Vec2[], grid: ArrayLike<Entity>, width: number, height: number) {
    let _end = new Set(end.map(x => x.x + x.y * width));

    let paren = new Array<Vec2>(width * height);
    let grid_ = new Uint16Array(width * height);
    grid_.fill(10000);

    let queue: Vec2[] = [];
    queue.push(...start);
    for (const { x, y } of start) {
        if (x < 0 || y < 0) debugger
        grid_[x + y * width] = 0;
    }

    function trace(x: number, y: number): Vec2[] {
        let p = paren[x + y * width];
        let d = grid_[x + y * width];

        if (d == 0) {
            return [{ x, y }];
        } else {
            let sub = trace(p.x, p.y);
            sub.push({ x, y });
            return sub;
        }
    }

    while (queue.length != 0) {
        let el = queue.shift();
        let hops = grid_[el.x + el.y * width] + 1;

        for (const item of combRange) {
            const x = el.x + item[0];
            const y = el.y + item[1];
            const id = x + y * width;

            if (y < 0 && _end.has(id)) {
                grid_[id] = hops;
                paren[id] = el;
                return trace(x, y);
            }

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            if (_end.has(id)) {
                grid_[id] = hops;
                paren[id] = el;
                return trace(x, y);
            }

            if (grid_[id] <= hops) continue;

            grid_[id] = hops;
            paren[id] = el;

            if (grid[id] == null) {
                queue.push({ x, y });
            }
        }
    }
}

/**
 * Places combinators in chunks with space for substations and  
 * @param combs 
 * @param ports 
 */
export function runAnnealing(combs: Entity[], ports: Set<Entity>) {
    let all = combs;

    // filter out inputs
    combs = combs.filter(x => !ports.has(x));

    const rng = new RNG();

    // make square grid
    const chunkDim = Math.ceil(Math.sqrt(combs.length / 128));
    const width = chunkDim * 16;
    const height = chunkDim * 8;
    const grid = new Array<Entity | null>(width * height);
    grid.fill(null);

    {
        let x = (width / 2) | 0;
        for (const p of ports) {
            p.x = x++;
            p.y = -3;
        }
    }

    for (let i = 0; i < combs.length; i++)
        grid[i] = combs[i];

    // shuffle grid
    for (let i = grid.length - 1; i > 0; i--) {
        let j = (rng.float() * (i + 1)) | 0;
        let temp = grid[i];
        grid[i] = grid[j];
        grid[j] = temp;
    }

    for (let i = 0; i < grid.length; i++) {
        const v = grid[i];
        if (v == null) continue;

        let x = i % width;
        let y = (i / width) | 0;

        v.x = (x % 16) + ((x / 16) | 0) * 18;
        v.y = (y % 8) + ((y / 8) | 0) * 9;

        v.id = i;
    }

    const iterationCount = 100 * Math.sqrt(combs.length);
    let T = 0.01;
    const k = 0.0001 ** (1 / iterationCount);

    for (let i = 0; i < iterationCount; i++) {
        for (let j = 0; j < combs.length; j++) {
            const comb = combs[j];

            let cost = countLong(comb);
            if (cost == 0)
                continue;

            let pos = (rng.float() * grid.length) | 0;
            let x = comb.x;
            let y = comb.y;

            if (grid[pos] == null) {
                let x1 = pos % width;
                let y1 = (pos / width) | 0;

                comb.x = (x1 % 16) + ((x1 / 16) | 0) * 18;
                comb.y = (y1 % 8) + ((y1 / 8) | 0) * 9;

                let newCost = countLong(comb);
                if (newCost < cost || rng.float() < T) {
                    grid[comb.id] = null;
                    grid[pos] = comb;
                    comb.id = pos;
                } else {
                    comb.x = x;
                    comb.y = y;
                }
            } else { // swap
                let other = grid[pos];
                cost += countLong(other);

                comb.x = other.x;
                comb.y = other.y;
                other.x = x;
                other.y = y;

                let newCost = countLong(comb) + countLong(other);

                if (newCost < cost || rng.float() < T) {
                    grid[pos] = comb;
                    grid[comb.id] = other;

                    other.id = comb.id;
                    comb.id = pos;
                } else {
                    other.x = comb.x;
                    other.y = comb.y;
                    comb.x = x;
                    comb.y = y;
                }
            }
        }

        /*if (i % 100 == 0) {
            let asd = 0;
            for (const c of combs) {
                asd += countLong(c);
            }
            console.log(asd, i, T);
        }*/

        T *= k;
    }

    for (const c of combs) {
        c.y *= 2;
    }
    let errors = opt_conn(all);

    { //#region pole placement for overlong wires
        const width = chunkDim * 18 + 2;
        const height = chunkDim * 18 + 2;
        // TODO: use seprate grids for red and green wires
        const grid = new Array<Entity | null>(width * height);

        for (const comb of all) {
            comb.x += 2;
            comb.y += 2;
        }

        for (const comb of combs) {
            let id = comb.x + comb.y * width;

            grid[id] = comb;
            if (comb.height == 2) {
                grid[id + width] = comb;
            }
        }

        for (let x = 0; x <= chunkDim; x++) {
            for (let y = 0; y <= chunkDim; y++) {
                let station = new Substation();
                station.x = x * 18;
                station.y = y * 18;

                grid[x * 18 + 0 + (y * 18 + 0) * width] = station;
                grid[x * 18 + 1 + (y * 18 + 0) * width] = station;
                grid[x * 18 + 0 + (y * 18 + 1) * width] = station;
                grid[x * 18 + 1 + (y * 18 + 1) * width] = station;

                all.push(station);

                if (x > 0) {
                    let last = grid[(x - 1) * 18 + y * 18 * width] as Substation;
                    last.neighbours.add(station);
                    station.neighbours.add(last);
                }
                if (y > 0) {
                    let last = grid[x * 18 + (y - 1) * 18 * width] as Substation;
                    last.neighbours.add(station);
                    station.neighbours.add(last);
                }
            }
        }

        for (const el of errors) {
            if (el.from.entity.y < 0) { // swap so we don't start outside the bounds
                [el.from, el.to] = [el.to, el.from];
            }
            let from = getPoints(el.from.entity);
            let to = getPoints(el.to.entity);

            let test = pathFind(from, to, grid, width, height);

            let a = el.from;
            for (let i = 1; i < test.length - 1; i++) {
                const b = test[i];
                if (grid[b.x + b.y * width]) {
                    debugger; // should not happen
                }

                let p = new SteelChest();
                p.x = b.x;
                p.y = b.y;
                all.push(p);
                grid[p.x + p.y * width] = p;

                a[el.color].add(p.input);
                p.input[el.color].add(a);

                a = p.input;
            }
            a[el.color].add(el.to);
            el.to[el.color].add(a);
        }

        for (const comb of all) {
            comb.x += comb.width / 2;
            comb.y += comb.height / 2;
        }
    }
}
