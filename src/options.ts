export let options: {
    verbose: boolean;
    // seed?: string;
    output?: string;
    modules?: string[];
    files?: string[];
    retry?: boolean;
    generator: "annealing" | "matrix";
} = {
    verbose: false,
    generator: "annealing"
};
