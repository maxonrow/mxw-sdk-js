"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wordlist = void 0;
exports.check = check;
exports.register = register;
// This gets overriddenby gulp during bip39-XX
var exportWordlist = false;
const hash_1 = require("../utils/hash");
const properties_1 = require("../utils/properties");
function check(wordlist) {
    var words = [];
    for (let i = 0; i < 2048; i++) {
        let word = wordlist.getWord(i);
        if (i !== wordlist.getWordIndex(word)) {
            return '0x';
        }
        words.push(word);
    }
    return (0, hash_1.id)(words.join('\n') + '\n');
}
class Wordlist {
    constructor(locale) {
        (0, properties_1.defineReadOnly)(this, 'locale', locale);
    }
    // Subclasses may override this
    split(mnemonic) {
        return mnemonic.toLowerCase().split(/ +/g);
    }
    // Subclasses may override this
    join(words) {
        return words.join(' ');
    }
}
exports.Wordlist = Wordlist;
function register(lang, name) {
    if (!name) {
        name = lang.locale;
    }
    if (exportWordlist) {
        let g = global;
        if (!(g.wordlists)) {
            (0, properties_1.defineReadOnly)(g, 'wordlists', {});
        }
        if (!g.wordlists[name]) {
            (0, properties_1.defineReadOnly)(g.wordlists, name, lang);
        }
        if (g.mxw && g.mxw.wordlists) {
            if (!g.mxw.wordlists[name]) {
                (0, properties_1.defineReadOnly)(g.mxw.wordlists, name, lang);
            }
        }
    }
}
//# sourceMappingURL=wordlist.js.map