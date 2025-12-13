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
import { BitConverter } from "../../../simple-io/convert/bit_converter.js";
import { MemoryStream } from "../../../simple-io/streams/memory_stream.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { DriveGenerator } from "./drive_generator.js";
/**
 * Represents a configuration file for a drive. The properties are encrypted in the file
 * with a master key which is password derived.
 */
export class DriveConfig {
    //TODO: support versioned formats for the file header
    #magicBytes = new Uint8Array(Generator.MAGIC_LENGTH);
    #version = new Uint8Array(Generator.VERSION_LENGTH);
    #salt = new Uint8Array(DriveGenerator.SALT_LENGTH);
    #iterations = new Uint8Array(DriveGenerator.ITERATIONS_LENGTH);
    #iv = new Uint8Array(DriveGenerator.IV_LENGTH);
    #encryptedData = new Uint8Array(DriveGenerator.COMBINED_KEY_LENGTH + DriveGenerator.DRIVE_ID_LENGTH);
    #hashSignature = new Uint8Array(Generator.HASH_RESULT_LENGTH);
    /**
     * Construct a class that hosts the properties of the drive config file
     */
    constructor() {
    }
    /**
     * Initializes the properties of the drive config file
     *
     * @param {Uint8Array} contents The byte array that contains the contents of the config file
     */
    async init(contents) {
        let ms = new MemoryStream(contents);
        await ms.read(this.#magicBytes, 0, Generator.MAGIC_LENGTH);
        await ms.read(this.#version, 0, Generator.VERSION_LENGTH);
        await ms.read(this.#salt, 0, DriveGenerator.SALT_LENGTH);
        await ms.read(this.#iterations, 0, DriveGenerator.ITERATIONS_LENGTH);
        await ms.read(this.#iv, 0, DriveGenerator.IV_LENGTH);
        await ms.read(this.#encryptedData, 0, DriveGenerator.COMBINED_KEY_LENGTH + DriveGenerator.AUTH_ID_SIZE);
        await ms.read(this.#hashSignature, 0, Generator.HASH_RESULT_LENGTH);
        await ms.close();
    }
    /**
     * Write the properties of a drive to a config file
     *
     * @param {IFile} configFile                   The configuration file that will be used to write the content into
     * @param {Uint8Array} magicBytes                   The magic bytes for the header
     * @param {number} version                      The version of the file format
     * @param {Uint8Array} salt                         The salt that will be used for encryption of the combined key
     * @param {number} iterations                   The iteration that will be used to derive the master key from a text password
     * @param {Uint8Array} keyIv                        The initial vector that was used with the master password to encrypt the combined key
     * @param {Uint8Array} encryptedData The encrypted combined key and drive id
     * @param {Uint8Array} hashSignature                The hash signature of the drive id
     */
    static async writeDriveConfig(configFile, magicBytes, version, salt, iterations, keyIv, encryptedData, hashSignature) {
        // construct the contents of the config file
        let ms2 = new MemoryStream();
        await ms2.write(magicBytes, 0, magicBytes.length);
        await ms2.write(new Uint8Array([version]), 0, 1);
        await ms2.write(salt, 0, salt.length);
        await ms2.write(BitConverter.toBytes(iterations, 4), 0, 4); // sizeof( int)
        await ms2.write(keyIv, 0, keyIv.length);
        await ms2.write(encryptedData, 0, encryptedData.length);
        await ms2.write(hashSignature, 0, hashSignature.length);
        await ms2.flush();
        await ms2.setPosition(0);
        // we write the contents to the config file
        let outputStream = await configFile.getOutputStream();
        await ms2.copyTo(outputStream);
        await outputStream.flush();
        await outputStream.close();
        await ms2.close();
    }
    /**
     * Clear properties.
     */
    clear() {
        this.#magicBytes.fill(0);
        this.#version.fill(0);
        this.#salt.fill(0);
        this.#iterations.fill(0);
        this.#iv.fill(0);
        this.#encryptedData.fill(0);
        this.#hashSignature.fill(0);
    }
    /**
     * Get the magic bytes from the config file.
     * @returns {Uint8Array} The magic bytes
     */
    getMagicBytes() {
        return this.#magicBytes;
    }
    /**
     * Get the salt to be used for the password key derivation.
     * @returns {Uint8Array} the salt
     */
    getSalt() {
        return this.#salt;
    }
    /**
     * Get the iterations to be used for the key derivation.
     * @returns {number} The number of iterations
     */
    getIterations() {
        if (this.#iterations == null)
            return 0;
        return BitConverter.toLong(this.#iterations, 0, DriveGenerator.ITERATIONS_LENGTH);
    }
    /**
     * Get encrypted data using the master key: drive key, hash key, drive id.
     * @returns {Uint8Array} The encrypted data
     */
    getEncryptedData() {
        return this.#encryptedData;
    }
    /**
     * Get the initial vector that was used to encrypt this drive configuration.
     * @returns {Uint8Array} The initial vector
     */
    getIv() {
        return this.#iv;
    }
    /**
     * Get the hash signature that was used to sign this drive configuration.
     * @returns {Uint8Array} The hash signature
     */
    getHashSignature() {
        return this.#hashSignature;
    }
}
