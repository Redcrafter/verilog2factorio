import { Arithmetic, ArithmeticOperations } from "./entities/Arithmetic.js";
import { Constant } from "./entities/Constant.js";
import { Entity, Endpoint, signalV, signalC, makeConnection, Color } from "./entities/Entity.js";

function delCon(e: Entity, cons: Endpoint[]) {
    function filter(cons: Endpoint[]) {
        return cons.filter(x => x.entity !== e);
    }

    for (const c of cons) {
        let n = c.entity;

        // TODO: could use n.type?
        if (n.input) {
            n.input.red.filter(x => x.entity != e);
            n.input.red = filter(n.input.red);
            n.input.green = filter(n.input.green);
        }
        n.output.red = filter(n.output.red);
        n.output.green = filter(n.output.green);
    }
}
function del(entity: Entity) {
    if (entity.input) {
        delCon(entity, entity.input.red);
        delCon(entity, entity.input.green);
    }
    delCon(entity, entity.output.red);
    delCon(entity, entity.output.green);
}

/** Removes entities which have no effect */
function opt_clean(entities: Entity[]) {
    let count = 0;

    console.log("Running opt_clean");

    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.keep) continue;

        if (e instanceof Constant && e.params[0].count == 0) {
            debugger;
            del(e);
            entities.splice(entities.indexOf(e), 1);
            i--;
            count++;
        }
    }

    console.log(`Removed ${count} combinators`);
}

/** 
 * replaces all node outputs with wire chains 
 * hopefully won't do that much because this is mostly resolved internally
*/
function opt_chain(entities: Entity[]) {
    console.log("Running opt_chain");

    function chain(point: Endpoint, color: Color) {
        let prop: "red" | "green" = color == Color.Red ? "red" : "green";

        let outs = point[prop];
        if (outs.length == 1) return;
        point[prop] = [];

        let last = point;
        for (const other of outs) {
            other[prop].splice(other[prop].indexOf(point), 1);
            makeConnection(color, last, other);
            last = other;
        }
    }

    for (const e of entities) {
        chain(e.output, Color.Red);
        chain(e.output, Color.Green);
    }
}

export function optimize(entities: Entity[]) {
    opt_clean(entities);
    opt_chain(entities);
    // opt_convert(entities);
}
