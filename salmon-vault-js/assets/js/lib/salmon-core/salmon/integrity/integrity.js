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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Integrity_chunkSize, _Integrity_key, _Integrity_hashSize, _Integrity_provider, _Integrity_integrity;
import { Generator } from "../generator.js";
import { SecurityException } from "../security_exception.js";
import { EncryptionMode } from "../streams/encryption_mode.js";
import { AESCTRTransformer } from "../transform/aes_ctr_transformer.js";
import { IntegrityException } from "../integrity/integrity_exception.js";
/**
 * Operations for calculating, storing, and verifying data integrity.
 * This class operates on chunks of byte arrays calculating hashes for each one.
 */
export class Integrity {
    /**
     * Instantiate an object to be used for applying and verifying hash signatures for each of the data chunks.
     *
     * @param {boolean} integrity True to enable integrity checks.
     * @param {Uint8Array} key       The key to use for hashing.
     * @param {number} chunkSize The chunk size. Use 0 to enable integrity on the whole file (1 chunk).
     *                  Use a positive number to specify integrity chunks.
     * @param {IHashProvider} provider  Hash implementation provider.
     * @param {number} hashSize The hash size.
     * @throws IntegrityException When integrity is comprimised
     * @throws SalmonSecurityException When security has failed
     */
    constructor(integrity, key, chunkSize = 0, provider, hashSize = 0) {
        /**
         * The chunk size to be used for integrity.
         */
        _Integrity_chunkSize.set(this, -1);
        /**
         * Key to be used for integrity signing and validation.
         */
        _Integrity_key.set(this, null);
        /**
         * Hash result size;
         */
        _Integrity_hashSize.set(this, 0);
        /**
         * The hash provider.
         */
        _Integrity_provider.set(this, void 0);
        _Integrity_integrity.set(this, void 0);
        if (chunkSize < 0 || (chunkSize > 0 && chunkSize < AESCTRTransformer.BLOCK_SIZE)
            || (chunkSize > 0 && chunkSize % AESCTRTransformer.BLOCK_SIZE != 0)) {
            throw new IntegrityException("Invalid chunk size, specify zero for default value or a positive number multiple of: "
                + AESCTRTransformer.BLOCK_SIZE);
        }
        if (integrity && key == null)
            throw new SecurityException("You need a hash key to use with integrity");
        if (integrity && (chunkSize === null || chunkSize == 0))
            __classPrivateFieldSet(this, _Integrity_chunkSize, Integrity.DEFAULT_CHUNK_SIZE, "f");
        else if (chunkSize && (integrity || chunkSize > 0))
            __classPrivateFieldSet(this, _Integrity_chunkSize, chunkSize, "f");
        if (hashSize < 0)
            throw new SecurityException("Hash size should be a positive number");
        __classPrivateFieldSet(this, _Integrity_key, key, "f");
        __classPrivateFieldSet(this, _Integrity_provider, provider, "f");
        __classPrivateFieldSet(this, _Integrity_integrity, integrity, "f");
        __classPrivateFieldSet(this, _Integrity_hashSize, hashSize, "f");
    }
    /**
     * Calculate hash of the data provided.
     *
     * @param {IHashProvider} provider    Hash implementation provider.
     * @param {Uint8Array} buffer      Data to calculate the hash.
     * @param {number} offset      Offset of the buffer that the hashing calculation will start from
     * @param {number} count       Length of the buffer that will be used to calculate the hash.
     * @param {Uint8Array} key         Key that will be used
     * @param {Uint8Array | null} includeData Additional data to be included in the calculation.
     * @returns {Promise<Uint8Array>} The hash.
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    static async calculateHash(provider, buffer, offset, count, key, includeData) {
        let finalBuffer = buffer;
        let finalOffset = offset;
        let finalCount = count;
        if (includeData) {
            finalBuffer = new Uint8Array(count + includeData.length);
            finalCount = count + includeData.length;
            for (let i = 0; i < includeData.length; i++)
                finalBuffer[i] = includeData[i];
            for (let i = 0; i < count; i++)
                finalBuffer[includeData.length + i] = buffer[offset + i];
            finalOffset = 0;
        }
        const hashValue = await provider.calc(key, finalBuffer, finalOffset, finalCount);
        return hashValue;
    }
    /**
     * Get the total number of bytes for all hash signatures for data of a specific length.
     * @param {number} length 		The length of the data.
     * @param {number} chunkSize      The byte size of the stream chunk that will be used to calculate the hash.
     *                       The length should be fixed value except for the last chunk which might be lesser since we don't use padding
     * @param {number} hashOffset     The hash key length that will be used as an offset.
     * @param {number} hashLength     The hash length.
     * @returns {number} The total number of bytes for all hash signatures.
     */
    static getTotalHashDataLength(mode, length, chunkSize, hashOffset, hashLength) {
        if (mode == EncryptionMode.Decrypt) {
            let chunks = Math.floor(length / (chunkSize + hashOffset));
            let rem = length % (chunkSize + hashOffset);
            if (rem > hashOffset)
                chunks++;
            return chunks * hashLength;
        }
        else {
            let chunks = Math.floor(length / chunkSize);
            let rem = length % chunkSize;
            if (rem > hashOffset)
                chunks++;
            return chunks * hashLength;
        }
    }
    /**
     * Return the number of bytes that all hash signatures occupy for each chunk size
     *
     * @param {number} count      Actual length of the real data int the base stream including header and hash signatures.
     * @param {number} hashOffset The hash key length
     * @returns {number} The number of bytes all hash signatures occupy
     */
    getHashDataLength(count, hashOffset) {
        if (__classPrivateFieldGet(this, _Integrity_chunkSize, "f") <= 0)
            return 0;
        return Integrity.getTotalHashDataLength(EncryptionMode.Decrypt, count, __classPrivateFieldGet(this, _Integrity_chunkSize, "f"), hashOffset, __classPrivateFieldGet(this, _Integrity_hashSize, "f"));
    }
    /**
     * Get the chunk size.
     * @returns {number} The chunk size.
     */
    getChunkSize() {
        return __classPrivateFieldGet(this, _Integrity_chunkSize, "f");
    }
    /**
     * Get the hash key.
     * @returns {Uint8Array} The hash key.
     */
    getKey() {
        if (__classPrivateFieldGet(this, _Integrity_key, "f") == null)
            throw new SecurityException("Key is missing");
        return __classPrivateFieldGet(this, _Integrity_key, "f");
    }
    /**
     * Get the integrity enabled option.
     * @returns {boolean} True if integrity is enabled.
     */
    useIntegrity() {
        return __classPrivateFieldGet(this, _Integrity_integrity, "f");
    }
    /**
     * Generate a hash signatures for each data chunk.
     * @param {Uint8Array} buffer The buffer containing the data chunks.
     * @param {boolean} includeHeaderData Include the header data in the first chunk.
     * @returns {Promise<Uint8Array[] | null>} The hash signatures.
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    async generateHashes(buffer, includeHeaderData) {
        if (!__classPrivateFieldGet(this, _Integrity_integrity, "f"))
            return null;
        const hashes = [];
        for (let i = 0; i < buffer.length; i += __classPrivateFieldGet(this, _Integrity_chunkSize, "f")) {
            const len = Math.min(__classPrivateFieldGet(this, _Integrity_chunkSize, "f"), buffer.length - i);
            hashes.push(await Integrity.calculateHash(__classPrivateFieldGet(this, _Integrity_provider, "f"), buffer, i, len, this.getKey(), i == 0 ? includeHeaderData : null));
        }
        return hashes;
    }
    /**
     * Get the hashes for each data chunk.
     * @param {Uint8Array} buffer The buffer that contains the data chunks.
     * @returns {Uint8Array[] | null} The hash signatures.
     */
    getHashes(buffer) {
        if (!__classPrivateFieldGet(this, _Integrity_integrity, "f"))
            return null;
        let hashes = new Array();
        for (let i = 0; i < buffer.length; i += Generator.HASH_KEY_LENGTH + __classPrivateFieldGet(this, _Integrity_chunkSize, "f")) {
            let hash = new Uint8Array(Generator.HASH_KEY_LENGTH);
            for (let j = 0; j < Generator.HASH_KEY_LENGTH; j++)
                hash[j] = buffer[i + j];
            hashes.push(hash);
        }
        return hashes;
    }
    /**
     * Verify the buffer chunks against the hash signatures.
     * @param {Uint8Array[]} hashes The hashes to verify.
     * @param {number} buffer The buffer that contains the chunks to verify the hashes.
     * @param {boolean| null} includeHeaderData
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    async verifyHashes(hashes, buffer, includeHeaderData) {
        let chunk = 0;
        for (let i = 0; i < buffer.length; i += __classPrivateFieldGet(this, _Integrity_chunkSize, "f")) {
            let nChunkSize = Math.min(__classPrivateFieldGet(this, _Integrity_chunkSize, "f"), buffer.length - i);
            let hash = await Integrity.calculateHash(__classPrivateFieldGet(this, _Integrity_provider, "f"), buffer, i, nChunkSize, this.getKey(), i == 0 ? includeHeaderData : null);
            for (let k = 0; k < hash.length; k++) {
                if (hash[k] != hashes[chunk][k]) {
                    throw new IntegrityException("Data corrupt or tampered");
                }
            }
            chunk++;
        }
    }
}
_Integrity_chunkSize = new WeakMap(), _Integrity_key = new WeakMap(), _Integrity_hashSize = new WeakMap(), _Integrity_provider = new WeakMap(), _Integrity_integrity = new WeakMap();
/**
 * Default chunk size for integrity.
 */
Integrity.DEFAULT_CHUNK_SIZE = 256 * 1024;
