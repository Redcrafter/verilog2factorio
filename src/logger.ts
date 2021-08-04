export interface Logger {
    log(message: string): void;
    assert(condition: Boolean, message?: string): void;
    table(tabularData?: any, properties?: string[]): void;
    error(message: string): void;
}

export let logger: Logger = console;

export function setLogger(l: Logger) {
    logger = l;
}
