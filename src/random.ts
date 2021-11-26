// based on https://github.com/bryc/code/tree/master/jshash
import { options } from "./options.js";

function xmur3(str: string) {
    let h = 1779033703 ^ str.length;

    for (var i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return () => {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        h ^= h >>> 16
        return h >>> 0;
    }
}

let seedGenerator: () => number;
function getSeed() {
    if (!seedGenerator) {
        seedGenerator = xmur3(options.seed);
    }
    return seedGenerator();
}

export class RNG {
    private a: number;
    private t: number;

    constructor() {
        this.a = getSeed();
    }

    int() {
        // mulberry32
        this.t = this.a += 0x6D2B79F5;
        this.t = Math.imul(this.t ^ this.t >>> 15, this.t | 1);
        this.t ^= this.t + Math.imul(this.t ^ this.t >>> 7, this.t | 61);
        return (this.t ^ this.t >>> 14) >>> 0;
    }
    float() {
        return this.int() / 4294967296;
    }
}
