'use strict';

import readline from "readline";
import { utils } from '../src.ts/index';

export function progress(counter: number, percentage?: number, message?: string, x?: number, y?: number) {
    readline.cursorTo(process.stdout, !x ? 0 : x, y);
    if (utils.isUndefinedOrNullOrEmpty(counter) || utils.isUndefinedOrNullOrEmpty(percentage) || 100 <= percentage) {
        process.stdout.write("* ");
    }
    else {
        switch (counter % 4) {
            case 0: process.stdout.write("/ "); break;
            case 1: process.stdout.write("- "); break;
            case 2: process.stdout.write("\\ "); break;
            default:
                process.stdout.write("| "); break;
        }
    }
    if (percentage) {
        process.stdout.write(percentage + "% : ");
    }
    if (message) {
        process.stdout.write(message);
    }
}

export function cursorTo(message: string, x: number, y: number) {
    readline.cursorTo(process.stdout, !x ? 0 : x, y);
    if (message) {
        process.stdout.write(message);
    }
}

export function clearLine() {
    readline.clearLine(process.stdout, 0);
}
