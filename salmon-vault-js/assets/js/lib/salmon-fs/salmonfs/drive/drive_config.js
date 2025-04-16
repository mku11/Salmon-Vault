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
var _DriveConfig_magicBytes, _DriveConfig_version, _DriveConfig_salt, _DriveConfig_iterations, _DriveConfig_iv, _DriveConfig_encryptedData, _DriveConfig_hashSignature;
import { BitConverter } from "../../../salmon-core/convert/bit_converter.js";
import { MemoryStream } from "../../../salmon-core/streams/memory_stream.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { DriveGenerator } from "./drive_generator.js";
/**
 * Represents a configuration file for a drive. The properties are encrypted in the file
 * with a master key which is password derived.
 */
export class DriveConfig {
    /**
     * Construct a class that hosts the properties of the drive config file
     */
    constructor() {
        //TODO: support versioned formats for the file header
        _DriveConfig_magicBytes.set(this, new Uint8Array(Generator.MAGIC_LENGTH));
        _DriveConfig_version.set(this, new Uint8Array(Generator.VERSION_LENGTH));
        _DriveConfig_salt.set(this, new Uint8Array(DriveGenerator.SALT_LENGTH));
        _DriveConfig_iterations.set(this, new Uint8Array(DriveGenerator.ITERATIONS_LENGTH));
        _DriveConfig_iv.set(this, new Uint8Array(DriveGenerator.IV_LENGTH));
        _DriveConfig_encryptedData.set(this, new Uint8Array(DriveGenerator.COMBINED_KEY_LENGTH + DriveGenerator.DRIVE_ID_LENGTH));
        _DriveConfig_hashSignature.set(this, new Uint8Array(Generator.HASH_RESULT_LENGTH));
    }
    /**
     * Initializes the properties of the drive config file
     *
     * @param {Uint8Array} contents The byte array that contains the contents of the config file
     */
    async init(contents) {
        let ms = new MemoryStream(contents);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_magicBytes, "f"), 0, Generator.MAGIC_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_version, "f"), 0, Generator.VERSION_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_salt, "f"), 0, DriveGenerator.SALT_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_iterations, "f"), 0, DriveGenerator.ITERATIONS_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_iv, "f"), 0, DriveGenerator.IV_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_encryptedData, "f"), 0, DriveGenerator.COMBINED_KEY_LENGTH + DriveGenerator.AUTH_ID_SIZE);
        await ms.read(__classPrivateFieldGet(this, _DriveConfig_hashSignature, "f"), 0, Generator.HASH_RESULT_LENGTH);
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
        __classPrivateFieldGet(this, _DriveConfig_magicBytes, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_version, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_salt, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_iterations, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_iv, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_encryptedData, "f").fill(0);
        __classPrivateFieldGet(this, _DriveConfig_hashSignature, "f").fill(0);
    }
    /**
     * Get the magic bytes from the config file.
     * @returns {Uint8Array} The magic bytes
     */
    getMagicBytes() {
        return __classPrivateFieldGet(this, _DriveConfig_magicBytes, "f");
    }
    /**
     * Get the salt to be used for the password key derivation.
     * @returns {Uint8Array} the salt
     */
    getSalt() {
        return __classPrivateFieldGet(this, _DriveConfig_salt, "f");
    }
    /**
     * Get the iterations to be used for the key derivation.
     * @returns {number} The number of iterations
     */
    getIterations() {
        if (__classPrivateFieldGet(this, _DriveConfig_iterations, "f") == null)
            return 0;
        return BitConverter.toLong(__classPrivateFieldGet(this, _DriveConfig_iterations, "f"), 0, DriveGenerator.ITERATIONS_LENGTH);
    }
    /**
     * Get encrypted data using the master key: drive key, hash key, drive id.
     * @returns {Uint8Array} The encrypted data
     */
    getEncryptedData() {
        return __classPrivateFieldGet(this, _DriveConfig_encryptedData, "f");
    }
    /**
     * Get the initial vector that was used to encrypt this drive configuration.
     * @returns {Uint8Array} The initial vector
     */
    getIv() {
        return __classPrivateFieldGet(this, _DriveConfig_iv, "f");
    }
    /**
     * Get the hash signature that was used to sign this drive configuration.
     * @returns {Uint8Array} The hash signature
     */
    getHashSignature() {
        return __classPrivateFieldGet(this, _DriveConfig_hashSignature, "f");
    }
}
_DriveConfig_magicBytes = new WeakMap(), _DriveConfig_version = new WeakMap(), _DriveConfig_salt = new WeakMap(), _DriveConfig_iterations = new WeakMap(), _DriveConfig_iv = new WeakMap(), _DriveConfig_encryptedData = new WeakMap(), _DriveConfig_hashSignature = new WeakMap();
