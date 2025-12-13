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
var _a;
import { Generator } from "../generator.js";
import { RangeExceededException } from "../range_exceeded_exception.js";
import { SecurityException } from "../security_exception.js";
/**
 * Abstract class for AES256 transformer implementations.
 *
 */
export class AESCTRTransformer {
    /**
     * Standard expansion key size for AES256 only.
     */
    static EXPANDED_KEY_SIZE = 240;
    /**
     * Salmon stream encryption block size, same as AES.
     */
    static BLOCK_SIZE = 16;
    /**
     * Key to be used for AES transformation.
     */
    #key = null;
    /**
     * Expanded key.
     */
    #expandedKey = new Uint8Array(_a.EXPANDED_KEY_SIZE);
    /**
     * Nonce to be used for CTR mode.
     */
    #nonce = null;
    /**
     * Current operation block.
     */
    #block = 0;
    /**
     * Current operation counter.
     */
    #counter = null;
    /**
     * Resets the Counter and the block count.
     */
    resetCounter() {
        if (this.#nonce == null)
            throw new SecurityException("No counter, run init first");
        this.#counter = new Uint8Array(_a.BLOCK_SIZE);
        for (let i = 0; i < this.#nonce.length; i++)
            this.#counter[i] = this.#nonce[i];
        this.#block = 0;
    }
    /**
     * Syncs the Counter based on what AES block position the stream is at.
     * The block count is already excluding the header and the hash signatures.
     * @param {number} position The new position to sync to
     */
    syncCounter(position) {
        let currBlock = Math.floor(position / _a.BLOCK_SIZE);
        this.resetCounter();
        this.increaseCounter(currBlock);
        this.#block = currBlock;
    }
    /**
     * Increase the Counter
     * We use only big endianness for AES regardless of the machine architecture
     *
     * @param {number} value value to increase counter by
     */
    increaseCounter(value) {
        if (this.#counter == null || this.#nonce == null)
            throw new SecurityException("No counter, run init first");
        if (value < 0)
            throw new Error("Value should be positive");
        // Javascript has its own limit for safe integer math
        if (value > Number.MAX_SAFE_INTEGER)
            throw new RangeExceededException("Current CTR max safe blocks exceeded");
        let index = _a.BLOCK_SIZE - 1;
        let carriage = 0;
        while (index >= 0 && value + carriage > 0) {
            if (index <= _a.BLOCK_SIZE - Generator.NONCE_LENGTH)
                throw new RangeExceededException("Current CTR max blocks exceeded");
            let val = (value + carriage) % 256;
            carriage = Math.floor(((this.#counter[index] & 0xFF) + val) / 256);
            this.#counter[index--] += val;
            value = Math.floor(value / 256);
        }
    }
    /**
     * Initialize the transformer. Most common operations include precalculating expansion keys or
     * any other prior initialization for efficiency.
     * @param {Uint8Array} key The key
     * @param {Uint8Array} nonce The nonce
     * @throws SalmonSecurityException Thrown when error with security
     */
    async init(key, nonce) {
        this.#key = key;
        this.#nonce = nonce;
    }
    /**
     * Get the current counter.
     * @returns {Uint8Array} The current counter.
     */
    getCounter() {
        if (this.#counter == null)
            throw new Error("No counter, run init() and resetCounter()");
        return this.#counter;
    }
    /**
     * Get the current block.
     * @returns {number} The current block.
     */
    getBlock() {
        return this.#block;
    }
    /**
     * Get the current encryption key.
     * @returns {Uint8Array | null} The encryption key.
     */
    getKey() {
        return this.#key;
    }
    /**
     * Get the expanded key if available.
     * @returns {Uint8Array | null} The expanded key.
     */
    getExpandedKey() {
        return this.#expandedKey;
    }
    /**
     * Get the nonce (initial counter)
     * @returns {Uint8Array | null} The nonce.
     */
    getNonce() {
        return this.#nonce;
    }
    /**
     * Set the expanded key. This should be called once during initialization phase.
     * @param {Uint8Array} expandedKey The expanded key
     */
    setExpandedKey(expandedKey) {
        this.#expandedKey = expandedKey;
    }
}
_a = AESCTRTransformer;
