let singleton = null;

class Logger {
    constructor(isDebug = false) {
        if (singleton) {
            return singleton;
        }
        this.isDebug = isDebug;
        singleton = this;
    }

    debug(...args) {
        if (this.isDebug) {
            console.log(...args);
        }
    }

    warn(...args) {
        console.warn(...args);
    }

    error(...args) {
        console.error(...args);
    }

    setDebug(isDebug) {
        this.isDebug = isDebug;
    }
}

const Log = new Logger();
export { Log };