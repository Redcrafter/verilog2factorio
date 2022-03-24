import { RawEntity, ConnectionPoint, SignalID } from "../blueprint.js";
import { Node } from "../nodes/Node.js";
import { Network } from "../optimization/nets.js";

export const signalA: SignalID = { type: "virtual", name: "signal-A" };
export const signalC: SignalID = { type: "virtual", name: "signal-C" };
export const signalR: SignalID = { type: "virtual", name: "signal-R" };
export const signalV: SignalID = { type: "virtual", name: "signal-V" };
export const signalW: SignalID = { type: "virtual", name: "signal-W" };

export const signalGreen: SignalID = { type: "virtual", name: "signal-green" };
export const signalGrey: SignalID = { type: "virtual", name: "signal-grey" };

/**
 * Everything can be used on the left side in conditionals.
 * The condition will be true when the condition is true for each input signal. 
 * The condition is also true if there are no signals. 
 * This means that the everything signal behaves as universal quantification.
 * 
 * The output of a decider combinator may also use everything, unless the input is set to each. 
 * When used, the combinator will output signal on every channel with non-zero input as long as the condition is true; the value will either be the input value or 1, depending on the corresponding setting.
 */
export const everything: SignalID = { type: "virtual", name: "signal-everything" };
/**
 * Anything can be used on the left side of conditions. It will be false when there are no inputs. The condition will be true when the condition is true for at least one signal. This means the anything signal behaves as existential quantification. 
 * 
 * When used in both the input and output of a decider combinator, anything will return one of the signals that matched.
 */
export const anything: SignalID = { type: "virtual", name: "signal-anything" };
/** Each can only be used in left input side and output of decider and arithmetic combinators. 
 * The signal can only be used as an output when also used as an input. 
 * When used in both the input and output, it makes a combinator perform its action on each input signal individually. 
 * The combinator will output the sum of each of the actions if only used in the input. 
 */
export const each: SignalID = { type: "virtual", name: "signal-each" };

export function isSpecial(s: SignalID) {
    return s == anything || s == everything || s == each;
}

export let allSignals: SignalID[] = [
    { type: "item", name: "wooden-chest" },
    { type: "item", name: "iron-chest" },
    { type: "item", name: "steel-chest" },
    { type: "item", name: "storage-tank" },
    { type: "item", name: "transport-belt" },
    { type: "item", name: "fast-transport-belt" },
    { type: "item", name: "express-transport-belt" },
    { type: "item", name: "underground-belt" },
    { type: "item", name: "fast-underground-belt" },
    { type: "item", name: "express-underground-belt" },
    { type: "item", name: "splitter" },
    { type: "item", name: "fast-splitter" },
    { type: "item", name: "express-splitter" },
    { type: "item", name: "burner-inserter" },
    { type: "item", name: "inserter" },
    { type: "item", name: "long-handed-inserter" },
    { type: "item", name: "fast-inserter" },
    { type: "item", name: "filter-inserter" },
    { type: "item", name: "stack-inserter" },
    { type: "item", name: "stack-filter-inserter" },
    { type: "item", name: "small-electric-pole" },
    { type: "item", name: "medium-electric-pole" },
    { type: "item", name: "big-electric-pole" },
    { type: "item", name: "substation" },
    { type: "item", name: "pipe" },
    { type: "item", name: "pipe-to-ground" },
    { type: "item", name: "pump" },
    { type: "item", name: "rail" },
    { type: "item", name: "train-stop" },
    { type: "item", name: "rail-signal" },
    { type: "item", name: "rail-chain-signal" },
    { type: "item", name: "locomotive" },
    { type: "item", name: "cargo-wagon" },
    { type: "item", name: "fluid-wagon" },
    { type: "item", name: "artillery-wagon" },
    { type: "item", name: "car" },
    { type: "item", name: "tank" },
    { type: "item", name: "spidertron" },
    { type: "item", name: "spidertron-remote" },
    { type: "item", name: "logistic-robot" },
    { type: "item", name: "construction-robot" },
    { type: "item", name: "logistic-chest-active-provider" },
    { type: "item", name: "logistic-chest-passive-provider" },
    { type: "item", name: "logistic-chest-storage" },
    { type: "item", name: "logistic-chest-buffer" },
    { type: "item", name: "logistic-chest-requester" },
    { type: "item", name: "roboport" },
    { type: "item", name: "small-lamp" },
    { type: "item", name: "red-wire" },
    { type: "item", name: "green-wire" },
    { type: "item", name: "arithmetic-combinator" },
    { type: "item", name: "decider-combinator" },
    { type: "item", name: "constant-combinator" },
    { type: "item", name: "power-switch" },
    { type: "item", name: "programmable-speaker" },
    { type: "item", name: "stone-brick" },
    { type: "item", name: "concrete" },
    { type: "item", name: "hazard-concrete" },
    { type: "item", name: "refined-concrete" },
    { type: "item", name: "refined-hazard-concrete" },
    { type: "item", name: "landfill" },
    { type: "item", name: "cliff-explosives" },
    { type: "item", name: "repair-pack" },
    { type: "item", name: "blueprint" },
    { type: "item", name: "deconstruction-planner" },
    { type: "item", name: "upgrade-planner" },
    { type: "item", name: "blueprint-book" },
    { type: "item", name: "boiler" },
    { type: "item", name: "steam-engine" },
    { type: "item", name: "solar-panel" },
    { type: "item", name: "accumulator" },
    { type: "item", name: "nuclear-reactor" },
    { type: "item", name: "heat-pipe" },
    { type: "item", name: "heat-exchanger" },
    { type: "item", name: "steam-turbine" },
    { type: "item", name: "burner-mining-drill" },
    { type: "item", name: "electric-mining-drill" },
    { type: "item", name: "offshore-pump" },
    { type: "item", name: "pumpjack" },
    { type: "item", name: "stone-furnace" },
    { type: "item", name: "steel-furnace" },
    { type: "item", name: "electric-furnace" },
    { type: "item", name: "assembling-machine-1" },
    { type: "item", name: "assembling-machine-2" },
    { type: "item", name: "assembling-machine-3" },
    { type: "item", name: "oil-refinery" },
    { type: "item", name: "chemical-plant" },
    { type: "item", name: "centrifuge" },
    { type: "item", name: "lab" },
    { type: "item", name: "beacon" },
    { type: "item", name: "speed-module" },
    { type: "item", name: "speed-module-2" },
    { type: "item", name: "speed-module-3" },
    { type: "item", name: "effectivity-module" },
    { type: "item", name: "effectivity-module-2" },
    { type: "item", name: "effectivity-module-3" },
    { type: "item", name: "productivity-module" },
    { type: "item", name: "productivity-module-2" },
    { type: "item", name: "productivity-module-3" },
    { type: "item", name: "wood" },
    { type: "item", name: "coal" },
    { type: "item", name: "stone" },
    { type: "item", name: "iron-ore" },
    { type: "item", name: "copper-ore" },
    { type: "item", name: "uranium-ore" },
    { type: "item", name: "raw-fish" },
    { type: "item", name: "iron-plate" },
    { type: "item", name: "copper-plate" },
    { type: "item", name: "solid-fuel" },
    { type: "item", name: "steel-plate" },
    { type: "item", name: "plastic-bar" },
    { type: "item", name: "sulfur" },
    { type: "item", name: "battery" },
    { type: "item", name: "explosives" },
    { type: "item", name: "crude-oil-barrel" },
    { type: "item", name: "heavy-oil-barrel" },
    { type: "item", name: "light-oil-barrel" },
    { type: "item", name: "lubricant-barrel" },
    { type: "item", name: "petroleum-gas-barrel" },
    { type: "item", name: "sulfuric-acid-barrel" },
    { type: "item", name: "water-barrel" },
    { type: "item", name: "copper-cable" },
    { type: "item", name: "iron-stick" },
    { type: "item", name: "iron-gear-wheel" },
    { type: "item", name: "empty-barrel" },
    { type: "item", name: "electronic-circuit" },
    { type: "item", name: "advanced-circuit" },
    { type: "item", name: "processing-unit" },
    { type: "item", name: "engine-unit" },
    { type: "item", name: "electric-engine-unit" },
    { type: "item", name: "flying-robot-frame" },
    { type: "item", name: "satellite" },
    { type: "item", name: "rocket-control-unit" },
    { type: "item", name: "low-density-structure" },
    { type: "item", name: "rocket-fuel" },
    { type: "item", name: "nuclear-fuel" },
    { type: "item", name: "uranium-235" },
    { type: "item", name: "uranium-238" },
    { type: "item", name: "uranium-fuel-cell" },
    { type: "item", name: "used-up-uranium-fuel-cell" },
    { type: "item", name: "automation-science-pack" },
    { type: "item", name: "logistic-science-pack" },
    { type: "item", name: "military-science-pack" },
    { type: "item", name: "chemical-science-pack" },
    { type: "item", name: "production-science-pack" },
    { type: "item", name: "utility-science-pack" },
    { type: "item", name: "space-science-pack" },
    { type: "item", name: "pistol" },
    { type: "item", name: "submachine-gun" },
    { type: "item", name: "shotgun" },
    { type: "item", name: "combat-shotgun" },
    { type: "item", name: "rocket-launcher" },
    { type: "item", name: "flamethrower" },
    { type: "item", name: "land-mine" },
    { type: "item", name: "firearm-magazine" },
    { type: "item", name: "piercing-rounds-magazine" },
    { type: "item", name: "uranium-rounds-magazine" },
    { type: "item", name: "shotgun-shell" },
    { type: "item", name: "piercing-shotgun-shell" },
    { type: "item", name: "cannon-shell" },
    { type: "item", name: "explosive-cannon-shell" },
    { type: "item", name: "uranium-cannon-shell" },
    { type: "item", name: "explosive-uranium-cannon-shell" },
    { type: "item", name: "artillery-shell" },
    { type: "item", name: "rocket" },
    { type: "item", name: "explosive-rocket" },
    { type: "item", name: "atomic-bomb" },
    { type: "item", name: "flamethrower-ammo" },
    { type: "item", name: "grenade" },
    { type: "item", name: "cluster-grenade" },
    { type: "item", name: "poison-capsule" },
    { type: "item", name: "slowdown-capsule" },
    { type: "item", name: "defender-capsule" },
    { type: "item", name: "distractor-capsule" },
    { type: "item", name: "destroyer-capsule" },
    { type: "item", name: "light-armor" },
    { type: "item", name: "heavy-armor" },
    { type: "item", name: "modular-armor" },
    { type: "item", name: "power-armor" },
    { type: "item", name: "power-armor-mk2" },
    { type: "item", name: "solar-panel-equipment" },
    { type: "item", name: "fusion-reactor-equipment" },
    { type: "item", name: "battery-equipment" },
    { type: "item", name: "battery-mk2-equipment" },
    { type: "item", name: "belt-immunity-equipment" },
    { type: "item", name: "exoskeleton-equipment" },
    { type: "item", name: "personal-roboport-equipment" },
    { type: "item", name: "personal-roboport-mk2-equipment" },
    { type: "item", name: "night-vision-equipment" },
    { type: "item", name: "energy-shield-equipment" },
    { type: "item", name: "energy-shield-mk2-equipment" },
    { type: "item", name: "personal-laser-defense-equipment" },
    { type: "item", name: "discharge-defense-equipment" },
    { type: "item", name: "discharge-defense-remote" },
    { type: "item", name: "stone-wall" },
    { type: "item", name: "gate" },
    { type: "item", name: "gun-turret" },
    { type: "item", name: "laser-turret" },
    { type: "item", name: "flamethrower-turret" },
    { type: "item", name: "artillery-turret" },
    { type: "item", name: "artillery-targeting-remote" },
    { type: "item", name: "radar" },
    { type: "item", name: "rocket-silo" },
    { type: "fluid", name: "water" },
    { type: "fluid", name: "crude-oil" },
    { type: "fluid", name: "steam" },
    { type: "fluid", name: "heavy-oil" },
    { type: "fluid", name: "light-oil" },
    { type: "fluid", name: "petroleum-gas" },
    { type: "fluid", name: "sulfuric-acid" },
    { type: "fluid", name: "lubricant" },
    { type: "virtual", name: "signal-0" },
    { type: "virtual", name: "signal-1" },
    { type: "virtual", name: "signal-2" },
    { type: "virtual", name: "signal-3" },
    { type: "virtual", name: "signal-4" },
    { type: "virtual", name: "signal-5" },
    { type: "virtual", name: "signal-6" },
    { type: "virtual", name: "signal-7" },
    { type: "virtual", name: "signal-8" },
    { type: "virtual", name: "signal-9" },
    signalA,
    { type: "virtual", name: "signal-B" },
    signalC,
    { type: "virtual", name: "signal-D" },
    { type: "virtual", name: "signal-E" },
    { type: "virtual", name: "signal-F" },
    { type: "virtual", name: "signal-G" },
    { type: "virtual", name: "signal-H" },
    { type: "virtual", name: "signal-I" },
    { type: "virtual", name: "signal-J" },
    { type: "virtual", name: "signal-K" },
    { type: "virtual", name: "signal-L" },
    { type: "virtual", name: "signal-M" },
    { type: "virtual", name: "signal-N" },
    { type: "virtual", name: "signal-O" },
    { type: "virtual", name: "signal-P" },
    { type: "virtual", name: "signal-Q" },
    signalR,
    { type: "virtual", name: "signal-S" },
    { type: "virtual", name: "signal-T" },
    { type: "virtual", name: "signal-U" },
    signalV,
    { type: "virtual", name: "signal-W" },
    { type: "virtual", name: "signal-X" },
    { type: "virtual", name: "signal-Y" },
    { type: "virtual", name: "signal-Z" },
    { type: "virtual", name: "signal-red" },
    signalGreen,
    { type: "virtual", name: "signal-blue" },
    { type: "virtual", name: "signal-yellow" },
    { type: "virtual", name: "signal-pink" },
    { type: "virtual", name: "signal-cyan" },
    { type: "virtual", name: "signal-white" },
    signalGrey,
    { type: "virtual", name: "signal-black" },
    { type: "virtual", name: "signal-check" },
    { type: "virtual", name: "signal-info" },
    { type: "virtual", name: "signal-dot" }
];

export const enum Color {
    Red = 1,
    Green = 2,
    Both = Red | Green
}

let globalSource: Node;
// used to keep track of which yosys node creates which combinator
export function setGlobalSource(source: Node) {
    globalSource = source;
}

export class Endpoint {
    public entity: Entity;
    public type: number;
    public outSignals: Set<SignalID>;

    public red: Network;
    public green: Network;

    // only used for final entity creation
    public redP = new Set<Endpoint>();
    public greenP = new Set<Endpoint>();

    constructor(ent: Entity, type: number, ...outSignals: SignalID[]) {
        this.entity = ent;
        this.type = type;
        this.outSignals = new Set(outSignals);
    }

    convert(): ConnectionPoint {
        return {
            red: [...this.redP].map(x => ({ entity_id: x.entity.id, circuit_id: x.type })),
            green: [...this.greenP].map(x => ({ entity_id: x.entity.id, circuit_id: x.type }))
        }
    }
}

export abstract class Entity {
    keep = false;

    x = -1;
    y = -1;

    dir = 4;

    input: Endpoint;
    output: Endpoint;
    id: number;

    source: Node;

    constructor() {
        this.source = globalSource;
    }

    abstract toObj(): RawEntity;
    abstract get width(): number;
    abstract get height(): number;

    /** Used to update {@link Endpoint.outSignals} when using special output signal */
    netSignalAdd(e: Endpoint, s: SignalID): void { }

    delete() {
        this.delCon(this.input, Color.Red);
        this.delCon(this.input, Color.Green);

        this.delCon(this.output, Color.Red);
        this.delCon(this.output, Color.Green);
    }

    delCon(e: Endpoint, c: Color) {
        e[c == Color.Red ? "red" : "green"]?.remove(e);
    }
}

export function makeConnection(c: Color | "red" | "green", ...points: Endpoint[]) {
    function connect(color: "red" | "green", a: Endpoint, b: Endpoint) {
        let an = a[color];
        let bn = b[color];

        let net: Network;
        if (an && bn) net = Network.merge(an, bn);
        else if (an) net = an;
        else if (bn) net = bn;
        else net = new Network(color);

        net.add(a);
        net.add(b);
    }

    if (c == "red") c = Color.Red;
    else if (c == "green") c = Color.Green;

    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];

        if (c & Color.Red) connect("red", a, b);
        if (c & Color.Green) connect("green", a, b);
    }
}
