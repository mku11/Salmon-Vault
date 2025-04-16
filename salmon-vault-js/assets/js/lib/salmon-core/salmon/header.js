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
var _Header_magicBytes, _Header_version, _Header_chunkSize, _Header_nonce, _Header_headerData;
import { BitConverter } from "../convert/bit_converter.js";
import { MemoryStream } from "../streams/memory_stream.js";
import { Generator } from "./generator.js";
/**
 * Header embedded in the SalmonStream. Header contains nonce and other information for
 * decrypting the stream.
 */
export class Header {
    /**
     * Get the nonce.
     * @returns {Uint8Array | null} The nonce saved in the header.
     */
    getNonce() {
        return __classPrivateFieldGet(this, _Header_nonce, "f");
    }
    /**
     * Get the chunk size.
     * @returns {number} Chunk size
     */
    getChunkSize() {
        return __classPrivateFieldGet(this, _Header_chunkSize, "f");
    }
    /**
     * Get the raw header data.
     * @returns {Uint8Array | null} Header data
     */
    getHeaderData() {
        return __classPrivateFieldGet(this, _Header_headerData, "f");
    }
    /**
     * Get the Salmon format  version
     * @returns {number} The format version
     */
    getVersion() {
        return __classPrivateFieldGet(this, _Header_version, "f");
    }
    /**
     * Get the magic bytes
     * @returns {Uint8Array} Magic bytes
     */
    getMagicBytes() {
        return __classPrivateFieldGet(this, _Header_magicBytes, "f");
    }
    constructor(headerData) {
        /**
         * Magic bytes.
         */
        _Header_magicBytes.set(this, new Uint8Array(Generator.MAGIC_LENGTH));
        /**
         * Format version from {@link Generator#VERSION}.
         */
        _Header_version.set(this, 0);
        /**
         * Chunk size used for data integrity.
         */
        _Header_chunkSize.set(this, 0);
        /**
         * Starting nonce for the CTR mode. This is the upper part of the Counter.
         *
         */
        _Header_nonce.set(this, null);
        /**
         * Binary data.
         */
        _Header_headerData.set(this, void 0);
        __classPrivateFieldSet(this, _Header_headerData, headerData, "f");
    }
    /**
     * Parse the header data from the stream
     * @param {RandomAccessStream} stream The stream.
     * @returns {Header} The header data.
     * @throws IOException Thrown if there is an IO error.
     */
    static async readHeaderData(stream) {
        if (await stream.getLength() == 0)
            return null;
        let pos = await stream.getPosition();
        await stream.setPosition(0);
        let headerData = new Uint8Array(Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH
            + Generator.CHUNK_SIZE_LENGTH + Generator.NONCE_LENGTH);
        await stream.read(headerData, 0, headerData.length);
        let header = new Header(headerData);
        let ms = new MemoryStream(__classPrivateFieldGet(header, _Header_headerData, "f"));
        __classPrivateFieldSet(header, _Header_magicBytes, new Uint8Array(Generator.MAGIC_LENGTH), "f");
        await ms.read(__classPrivateFieldGet(header, _Header_magicBytes, "f"), 0, __classPrivateFieldGet(header, _Header_magicBytes, "f").length);
        let versionBytes = new Uint8Array(Generator.VERSION_LENGTH);
        await ms.read(versionBytes, 0, Generator.VERSION_LENGTH);
        __classPrivateFieldSet(header, _Header_version, versionBytes[0], "f");
        let chunkSizeHeader = new Uint8Array(Generator.CHUNK_SIZE_LENGTH);
        await ms.read(chunkSizeHeader, 0, chunkSizeHeader.length);
        __classPrivateFieldSet(header, _Header_chunkSize, BitConverter.toLong(chunkSizeHeader, 0, Generator.CHUNK_SIZE_LENGTH), "f");
        __classPrivateFieldSet(header, _Header_nonce, new Uint8Array(Generator.NONCE_LENGTH), "f");
        await ms.read(__classPrivateFieldGet(header, _Header_nonce, "f"), 0, __classPrivateFieldGet(header, _Header_nonce, "f").length);
        await stream.setPosition(pos);
        return header;
    }
    static async writeHeader(stream, nonce, chunkSize) {
        let magicBytes = Generator.getMagicBytes();
        let version = Generator.getVersion();
        let versionBytes = new Uint8Array([version]);
        let chunkSizeBytes = BitConverter.toBytes(chunkSize, Generator.CHUNK_SIZE_LENGTH);
        let headerData = new Uint8Array(Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH
            + Generator.CHUNK_SIZE_LENGTH + Generator.NONCE_LENGTH);
        let ms = new MemoryStream(headerData);
        await ms.write(magicBytes, 0, magicBytes.length);
        await ms.write(versionBytes, 0, versionBytes.length);
        await ms.write(chunkSizeBytes, 0, chunkSizeBytes.length);
        await ms.write(nonce, 0, nonce.length);
        await ms.setPosition(0);
        let header = await Header.readHeaderData(ms);
        let pos = await stream.getPosition();
        await stream.setPosition(0);
        await ms.setPosition(0);
        await ms.copyTo(stream);
        await ms.close();
        await stream.flush();
        await stream.setPosition(pos);
        return header;
    }
    /**
     * Set the header chunk size
     * @param {number} chunkSize The chunk size
     */
    setChunkSize(chunkSize) {
        __classPrivateFieldSet(this, _Header_chunkSize, chunkSize, "f");
    }
    /**
     * Set the Salmon format version
     * @param {number} version The format version
     */
    setVersion(version) {
        __classPrivateFieldSet(this, _Header_version, version, "f");
    }
    /**
     * Set the nonce to be used.
     * @param {Uint8Array} nonce The nonce
     */
    setNonce(nonce) {
        __classPrivateFieldSet(this, _Header_nonce, nonce, "f");
    }
}
_Header_magicBytes = new WeakMap(), _Header_version = new WeakMap(), _Header_chunkSize = new WeakMap(), _Header_nonce = new WeakMap(), _Header_headerData = new WeakMap();
Header.HEADER_LENGTH = 16;
