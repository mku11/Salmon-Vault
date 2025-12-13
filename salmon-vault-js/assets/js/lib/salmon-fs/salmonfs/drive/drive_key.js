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
 * Encryption keys and properties.
 */
export class DriveKey {
    #masterKey = null;
    #driveKey = null;
    #hashKey = null;
    #iterations = 0;
    /**
     * Clear the properties from memory.
     */
    clear() {
        if (this.#driveKey)
            this.#driveKey.fill(0);
        this.#driveKey = null;
        if (this.#hashKey)
            this.#hashKey.fill(0);
        this.#hashKey = null;
        if (this.#masterKey)
            this.#masterKey.fill(0);
        this.#masterKey = null;
        this.#iterations = 0;
    }
    /**
     * Function returns the encryption key that will be used to encrypt/decrypt the files
     * @returns {Uint8Array | null} The drive key
     */
    getDriveKey() {
        return this.#driveKey;
    }
    /**
     * Function returns the hash key that will be used to sign the file chunks
     * @returns {Uint8Array | null} The hash key
     */
    getHashKey() {
        return this.#hashKey;
    }
    /**
     * Set the drive key.
     * @param {Uint8Array | null} driveKey The drive key
     */
    setDriveKey(driveKey) {
        this.#driveKey = driveKey;
    }
    /**
     * Set the hash key.
     * @param {Uint8Array | null} hashKey The hash key
     */
    setHashKey(hashKey) {
        this.#hashKey = hashKey;
    }
    /**
     * Get the master key.
     * @returns {Uint8Array | null} The master key
     */
    getMasterKey() {
        return this.#masterKey;
    }
    /**
     * Set the master key.
     * @param {Uint8Array | null} masterKey The master key
     */
    setMasterKey(masterKey) {
        this.#masterKey = masterKey;
    }
    /**
     * Get the number of iterations for the master key derivation.
     * @returns {number} The iterations
     */
    getIterations() {
        return this.#iterations;
    }
    /**
     * Set the number of iterations for the master key derivation.
     * @param {number} iterations The iterations
     */
    setIterations(iterations) {
        this.#iterations = iterations;
    }
}
