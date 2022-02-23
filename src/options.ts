export let options: {
    verbose: boolean;
    debug: boolean;
    seed?: string;
    output?: string;
    modules?: string[];
    files?: string[];
    retry?: boolean;
    generator: "annealing" | "matrix";
} = {
    verbose: false,
    debug: false,
    seed: Math.random().toString(),
    generator: "annealing"
};
