export class Logger {
    constructor(isDebug = false) {
        this.isDebug = isDebug;
    }

    log(...args) {
        if (this.isDebug) {
            console.log(...args);
        }
    }

    warn(...args) {
        if (this.isDebug) {
            console.warn(...args);
        }
    }

    error(...args) {
     console.error(...args);
    }
}