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
/**
 * Utility class that generates secure random byte arrays.
 */
export class Generator {
    /**
     * Gets the fixed magic bytes array
     * @returns {Uint8Array} The magic bytes
     */
    static getMagicBytes() {
        return new TextEncoder().encode(Generator.MAGIC_BYTES);
    }
    /**
     * Returns the current Salmon format version.
     * @returns {number} The current version
     */
    static getVersion() {
        return Generator.VERSION;
    }
    /**
     * Returns a secure random byte array. To be used when generating keys, initial vectors, and nonces.
     * @param {number} size The size of the byte array.
     * @returns {Uint8Array} The random secure byte array.
     */
    static getSecureRandomBytes(size) {
        let bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return bytes;
    }
}
/**
 * Version.
 */
Generator.VERSION = 2;
/**
 * Lenght for the magic bytes.
 */
Generator.MAGIC_LENGTH = 3;
/**
 * Length for the Version in the data header.
 */
Generator.VERSION_LENGTH = 1;
/**
 * Should be 16 for AES256 the same as the iv.
 */
Generator.BLOCK_SIZE = 16;
/**
 * Encryption key length for AES256.
 */
Generator.KEY_LENGTH = 32;
/**
 * HASH Key length for integrity, currently we use HMAC SHA256.
 */
Generator.HASH_KEY_LENGTH = 32;
/**
 * Hash signature size for integrity, currently we use HMAC SHA256.
 */
Generator.HASH_RESULT_LENGTH = 32;
/**
 * Nonce size.
 */
Generator.NONCE_LENGTH = 8;
/**
 * Chunk size format length.
 */
Generator.CHUNK_SIZE_LENGTH = 4;
/**
 * Magic bytes.
 */
Generator.MAGIC_BYTES = "SLM";
