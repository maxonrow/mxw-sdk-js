"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    return hash_1.id(words.join('\n') + '\n');
}
exports.check = check;
class Wordlist {
    constructor(locale) {
        properties_1.defineReadOnly(this, 'locale', locale);
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
            properties_1.defineReadOnly(g, 'wordlists', {});
        }
        if (!g.wordlists[name]) {
            properties_1.defineReadOnly(g.wordlists, name, lang);
        }
        if (g.mxw && g.mxw.wordlists) {
            if (!g.mxw.wordlists[name]) {
                properties_1.defineReadOnly(g.mxw.wordlists, name, lang);
            }
        }
    }
}
exports.register = register;
//# sourceMappingURL=wordlist.js.map