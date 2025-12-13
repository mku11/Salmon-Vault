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
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { BitConverter } from "../../../simple-io/convert/bit_converter.js";
/**
 * Utility class generates internal secure properties for the drive.
 */
export class DriveGenerator {
    /**
     * Initial vector length that will be used for encryption and master encryption of the combined key
     */
    static IV_LENGTH = 16;
    /**
     * combined key is drive key + hash key.
     */
    static COMBINED_KEY_LENGTH = Generator.KEY_LENGTH + Generator.HASH_KEY_LENGTH;
    /**
     * Salt length.
     */
    static SALT_LENGTH = 24;
    /**
     * Drive ID size.
     */
    static DRIVE_ID_LENGTH = 16;
    /**
     * Auth ID size
     */
    static AUTH_ID_SIZE = 16;
    /**
     * Length for the iterations that will be stored in the encrypted data header.
     */
    static ITERATIONS_LENGTH = 4;
    /**
     * Master key to encrypt the combined key we also use AES256.
     */
    static MASTER_KEY_LENGTH = 32;
    static #iterations = 65536;
    /**
     * Generate a Drive ID.
     * @returns {Uint8Array} The Drive ID.
     */
    static generateDriveID() {
        return Generator.getSecureRandomBytes(DriveGenerator.DRIVE_ID_LENGTH);
    }
    /**
     * Generate a secure random authorization ID.
     * @returns {Uint8Array} The authorization Id (16 bytes).
     */
    static generateAuthId() {
        return Generator.getSecureRandomBytes(DriveGenerator.AUTH_ID_SIZE);
    }
    /**
     * Generates a secure random combined key (drive key + hash key)
     * @returns {Uint8Array} The length of the combined key.
     */
    static generateCombinedKey() {
        return Generator.getSecureRandomBytes(DriveGenerator.COMBINED_KEY_LENGTH);
    }
    /**
     * Generates the initial vector that will be used with the master key to encrypt the combined key (drive key + hash key)
     * @returns {Uint8Array} The master key initial vector
     */
    static generateMasterKeyIV() {
        return Generator.getSecureRandomBytes(DriveGenerator.IV_LENGTH);
    }
    /**
     * Generates a salt.
     * @returns {Uint8Array} The salt byte array.
     */
    static generateSalt() {
        return Generator.getSecureRandomBytes(DriveGenerator.SALT_LENGTH);
    }
    /**
     * Get the starting nonce that will be used for encrypt drive files and filenames.
     * @returns {Uint8Array} A secure random byte array (8 bytes).
     */
    static getStartingNonce() {
        let bytes = new Uint8Array(Generator.NONCE_LENGTH);
        return bytes;
    }
    /**
     * Get the default max nonce to be used for drives.
     * @returns {Uint8Array} A secure random byte array (8 bytes).
     */
    static getMaxNonce() {
        return BitConverter.toBytes(Number.MAX_SAFE_INTEGER, 8);
    }
    /**
     * Returns the iterations used for deriving the combined key from
     * the text password
     * @returns {number} The current iterations for the key derivation.
     */
    static getIterations() {
        return DriveGenerator.#iterations;
    }
    /**
     * Set the default iterations.
     * @param {number} iterations The iterations
     */
    static setIterations(iterations) {
        DriveGenerator.#iterations = iterations;
    }
}
