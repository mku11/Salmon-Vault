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
var _a, _TextDecryptor_decryptor;
import { Decryptor } from "../decryptor.js";
import { Base64Utils } from "../encode/base64_utils.js";
import { EncryptionFormat } from "../streams/encryption_format.js";
/**
 * Utility class that encrypts and decrypts text strings.
 */
export class TextDecryptor {
    /**
     * Decrypts a text String using AES256 with the key and nonce provided.
     *
     * @param {string} text  Text to be decrypted.
     * @param {string} key   The encryption key to be used.
     * @param {Uint8Array | null} nonce The nonce to be used, set only if header=false.
     * @param {EncryptionFormat} format The format to use, see {@link EncryptionFormat}
     * @param {boolean} integrity True if you want to calculate and store hash signatures for each chunkSize
     * @param {Uint8Array | null} hashKey Hash key to be used for all chunks.
     * @param {number} chunkSize The chunk size.
     * @returns {Promise<string>} The decrypted text.
     * @throws IOException
     * @throws SalmonSecurityException Thrown when error with security
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    static async decryptString(text, key, nonce, format = EncryptionFormat.Salmon, integrity = false, hashKey = null, chunkSize = 0) {
        let bytes = Base64Utils.getBase64().decode(text);
        let decBytes = await __classPrivateFieldGet(this, _a, "f", _TextDecryptor_decryptor).decrypt(bytes, key, nonce, format, integrity, hashKey, chunkSize);
        let decString = new TextDecoder().decode(decBytes);
        return decString;
    }
}
_a = TextDecryptor;
_TextDecryptor_decryptor = { value: new Decryptor() };
