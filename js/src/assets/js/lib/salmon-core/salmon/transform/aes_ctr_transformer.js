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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _AESCTRTransformer_key, _AESCTRTransformer_expandedKey, _AESCTRTransformer_nonce, _AESCTRTransformer_block, _AESCTRTransformer_counter;
import { Generator } from "../generator.js";
import { RangeExceededException } from "../range_exceeded_exception.js";
import { SecurityException } from "../security_exception.js";
/**
 * Abstract class for AES256 transformer implementations.
 *
 */
export class AESCTRTransformer {
    constructor() {
        /**
         * Key to be used for AES transformation.
         */
        _AESCTRTransformer_key.set(this, null);
        /**
         * Expanded key.
         */
        _AESCTRTransformer_expandedKey.set(this, new Uint8Array(_a.EXPANDED_KEY_SIZE));
        /**
         * Nonce to be used for CTR mode.
         */
        _AESCTRTransformer_nonce.set(this, null);
        /**
         * Current operation block.
         */
        _AESCTRTransformer_block.set(this, 0);
        /**
         * Current operation counter.
         */
        _AESCTRTransformer_counter.set(this, null);
    }
    /**
     * Resets the Counter and the block count.
     */
    resetCounter() {
        if (__classPrivateFieldGet(this, _AESCTRTransformer_nonce, "f") == null)
            throw new SecurityException("No counter, run init first");
        __classPrivateFieldSet(this, _AESCTRTransformer_counter, new Uint8Array(_a.BLOCK_SIZE), "f");
        for (let i = 0; i < __classPrivateFieldGet(this, _AESCTRTransformer_nonce, "f").length; i++)
            __classPrivateFieldGet(this, _AESCTRTransformer_counter, "f")[i] = __classPrivateFieldGet(this, _AESCTRTransformer_nonce, "f")[i];
        __classPrivateFieldSet(this, _AESCTRTransformer_block, 0, "f");
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
        __classPrivateFieldSet(this, _AESCTRTransformer_block, currBlock, "f");
    }
    /**
     * Increase the Counter
     * We use only big endianness for AES regardless of the machine architecture
     *
     * @param {number} value value to increase counter by
     */
    increaseCounter(value) {
        if (__classPrivateFieldGet(this, _AESCTRTransformer_counter, "f") == null || __classPrivateFieldGet(this, _AESCTRTransformer_nonce, "f") == null)
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
            carriage = Math.floor(((__classPrivateFieldGet(this, _AESCTRTransformer_counter, "f")[index] & 0xFF) + val) / 256);
            __classPrivateFieldGet(this, _AESCTRTransformer_counter, "f")[index--] += val;
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
        __classPrivateFieldSet(this, _AESCTRTransformer_key, key, "f");
        __classPrivateFieldSet(this, _AESCTRTransformer_nonce, nonce, "f");
    }
    /**
     * Get the current counter.
     * @returns {Uint8Array} The current counter.
     */
    getCounter() {
        if (__classPrivateFieldGet(this, _AESCTRTransformer_counter, "f") == null)
            throw new Error("No counter, run init() and resetCounter()");
        return __classPrivateFieldGet(this, _AESCTRTransformer_counter, "f");
    }
    /**
     * Get the current block.
     * @returns {number} The current block.
     */
    getBlock() {
        return __classPrivateFieldGet(this, _AESCTRTransformer_block, "f");
    }
    /**
     * Get the current encryption key.
     * @returns {Uint8Array | null} The encryption key.
     */
    getKey() {
        return __classPrivateFieldGet(this, _AESCTRTransformer_key, "f");
    }
    /**
     * Get the expanded key if available.
     * @returns {Uint8Array | null} The expanded key.
     */
    getExpandedKey() {
        return __classPrivateFieldGet(this, _AESCTRTransformer_expandedKey, "f");
    }
    /**
     * Get the nonce (initial counter)
     * @returns {Uint8Array | null} The nonce.
     */
    getNonce() {
        return __classPrivateFieldGet(this, _AESCTRTransformer_nonce, "f");
    }
    /**
     * Set the expanded key. This should be called once during initialization phase.
     * @param {Uint8Array} expandedKey The expanded key
     */
    setExpandedKey(expandedKey) {
        __classPrivateFieldSet(this, _AESCTRTransformer_expandedKey, expandedKey, "f");
    }
}
_a = AESCTRTransformer, _AESCTRTransformer_key = new WeakMap(), _AESCTRTransformer_expandedKey = new WeakMap(), _AESCTRTransformer_nonce = new WeakMap(), _AESCTRTransformer_block = new WeakMap(), _AESCTRTransformer_counter = new WeakMap();
/**
 * Standard expansion key size for AES256 only.
 */
AESCTRTransformer.EXPANDED_KEY_SIZE = 240;
/**
 * Salmon stream encryption block size, same as AES.
 */
AESCTRTransformer.BLOCK_SIZE = 16;
