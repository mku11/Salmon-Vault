/*
MIT License

Copyright (c) 2021 Max Kas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import { NonceSequence } from "../sequence/nonce_sequence.js";
/**
 * Serializes sequences for all the drives the device is authorized.
 */
export class SequenceSerializer {
    /**
     * Serialize the sequences to a json string.
     *
     * @param {Map<string, NonceSequence>} driveAuthEntries The sequences to convert to text.
     * @returns {string} The contents
     * @throws SequenceException Thrown if error with the nonce sequence
     */
    serialize(driveAuthEntries) {
        let contents = JSON.stringify(Object.fromEntries(driveAuthEntries));
        return contents;
    }
    /**
     * Deserialize sequences from json string.
     *
     * @param {string} contents The contents containing the nonce sequences.
     * @returns {Map<string, NonceSequence>} The sequences
     * @throws SequenceException Thrown if error with the nonce sequence
     */
    deserialize(contents) {
        if (contents == '')
            return new Map();
        let configsObj = JSON.parse(contents);
        let configs = new Map();
        for (let key in configsObj) {
            let seq = configsObj[key];
            configs.set(key, new NonceSequence(seq.id, seq.authId, this.#objToArray(seq.nextNonce), this.#objToArray(seq.maxNonce), seq.status));
        }
        return configs;
    }
    #objToArray(obj) {
        if (obj == null)
            return null;
        let length = Object.values(obj).length;
        let arr = new Uint8Array(length);
        for (let key in obj) {
            let index = parseInt(key);
            arr[index] = obj[key];
        }
        return arr;
    }
}
