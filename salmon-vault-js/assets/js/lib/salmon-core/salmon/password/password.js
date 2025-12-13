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
import { PbkdfAlgo } from "./pbkdf_algo.js";
import { DefaultPbkdfProvider } from "./default_pbkdf_provider.js";
import { PbkdfFactory } from "./pbkdf_factory.js";
/**
 * Generates security keys based on text passwords.
 */
export class Password {
    static #pbkdfAlgo = PbkdfAlgo.SHA256;
    static #provider = new DefaultPbkdfProvider();
    /**
     * Returns the current global PBKDF algorithm.
     *
     * @returns {PbkdfAlgo} The PBKDF algorithm to be used.
     */
    static getPbkdfAlgo() {
        return Password.#pbkdfAlgo;
    }
    /**
     * Set the global PDKDF algorithm to be used for key derivation.
     *
     * @param {PbkdfAlgo} pbkdfAlgo The Pbkdf algorithm
     */
    static setPbkdfAlgo(pbkdfAlgo) {
        Password.#pbkdfAlgo = pbkdfAlgo;
    }
    /**
     * Set the global PBKDF implementation to be used for text key derivation.
     *
     * @param {PbkdfType} pbkdfType The pbkdf implementation type.
     */
    static setPbkdfType(pbkdfType) {
        Password.#provider = PbkdfFactory.create(pbkdfType);
    }
    /**
     * Set the global PBKDF provider to be used for text key derivation.
     *
     * @param {ISalmonPbkdfProvider} pbkdfProvider The PBKDF provider.
     */
    static setPbkdfProvider(pbkdfProvider) {
        Password.#provider = pbkdfProvider;
    }
    /**
     * Derives the key from a text password
     *
     * @param {string} pass       The text password to be used
     * @param {Uint8Array} salt       The salt to be used for the key derivation
     * @param {number} iterations The number of iterations the key derivation algorithm will use
     * @param {number} length     The length of master key to return
     * @returns {Promise<Uint8Array>} The derived master key.
     * @throws SalmonSecurityException Thrown when error with security
     */
    static async getMasterKey(pass, salt, iterations, length) {
        let masterKey = await Password.getKeyFromPassword(pass, salt, iterations, length);
        return masterKey;
    }
    /**
     * Function will derive a key from a text password
     *
     * @param {string} password    The password that will be used to derive the key
     * @param {Uint8Array} salt        The salt byte array that will be used together with the password
     * @param {number} iterations  The iterations to be used with Pbkdf2
     * @param {number} outputBytes The number of bytes for the key
     * @returns {Promise<Uint8Array>} The derived key.
     * @throws SalmonSecurityException Thrown when error with security
     */
    static async getKeyFromPassword(password, salt, iterations, outputBytes) {
        return Password.#provider.getKey(password, salt, iterations, outputBytes, Password.#pbkdfAlgo);
    }
}
