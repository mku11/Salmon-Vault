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
var _a, _AuthConfig_driveId, _AuthConfig_authId, _AuthConfig_startNonce, _AuthConfig_maxNonce, _AuthConfig_writeAuthFile, _AuthConfig_writeToStream, _AuthConfig_getAuthConfig, _AuthConfig_verifyAuthId, _AuthConfig_importSequence;
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { MemoryStream } from "../../../salmon-core/streams/memory_stream.js";
import { Integrity } from "../../../salmon-core/salmon/integrity/integrity.js";
import { DriveGenerator } from "../drive/drive_generator.js";
import { AuthException } from "./auth_exception.js";
import { AesFile } from "../file/aes_file.js";
import { Status } from "../../../salmon-core/salmon/sequence/nonce_sequence.js";
import { SequenceException } from "../../../salmon-core/salmon/sequence/sequence_exception.js";
import { SecurityException } from "../../../salmon-core/salmon/security_exception.js";
import { Nonce } from "../../../salmon-core/salmon/nonce.js";
import { BitConverter } from "../../../salmon-core/convert/bit_converter.js";
/**
 * Device Authorization Configuration. This represents the authorization that will be provided
 * to the target device to allow writing operations for a virtual drive.
 */
export class AuthConfig {
    /**
     * Get the drive ID to grant authorization for.
     * @returns {Uint8Array} The drive id
     */
    getDriveId() {
        return __classPrivateFieldGet(this, _AuthConfig_driveId, "f");
    }
    /**
     * Get the authorization ID for the target device.
     * @returns {Uint8Array} The auth id
     */
    getAuthId() {
        return __classPrivateFieldGet(this, _AuthConfig_authId, "f");
    }
    /**
     * Get the nonce maximum value the target device will use.
     * @returns {Uint8Array} The starting nonce.
     */
    getStartNonce() {
        return __classPrivateFieldGet(this, _AuthConfig_startNonce, "f");
    }
    /**
     * Get the nonce maximum value the target device will use.
     * @returns {Uint8Array} The nonce max value.
     */
    getMaxNonce() {
        return __classPrivateFieldGet(this, _AuthConfig_maxNonce, "f");
    }
    /**
     * Instantiate a class with the properties of the authorization config file.
     */
    constructor() {
        _AuthConfig_driveId.set(this, new Uint8Array(DriveGenerator.DRIVE_ID_LENGTH));
        _AuthConfig_authId.set(this, new Uint8Array(DriveGenerator.AUTH_ID_SIZE));
        _AuthConfig_startNonce.set(this, new Uint8Array(Generator.NONCE_LENGTH));
        _AuthConfig_maxNonce.set(this, new Uint8Array(Generator.NONCE_LENGTH));
    }
    /**
     * Initialize the authorization configuration.
     * @param {Uint8Array} contents The authorization configuration data
     */
    async init(contents) {
        let ms = new MemoryStream(contents);
        await ms.read(__classPrivateFieldGet(this, _AuthConfig_driveId, "f"), 0, DriveGenerator.DRIVE_ID_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _AuthConfig_authId, "f"), 0, DriveGenerator.AUTH_ID_SIZE);
        await ms.read(__classPrivateFieldGet(this, _AuthConfig_startNonce, "f"), 0, Generator.NONCE_LENGTH);
        await ms.read(__classPrivateFieldGet(this, _AuthConfig_maxNonce, "f"), 0, Generator.NONCE_LENGTH);
        await ms.close();
    }
    /**
     * Import the device authorization file.
     *
     * @param {AesDrive} drive The drive
     * @param {IFile} authConfigFile The filepath to the authorization file.
     * @throws Exception
     */
    static async importAuthFile(drive, authConfigFile) {
        let sequencer = drive.getSequencer();
        if (!sequencer)
            throw new Error("No sequencer defined");
        let driveId = drive.getDriveId();
        if (driveId == null)
            throw new Error("Could not get drive id, make sure you init the drive first");
        let sequence = await sequencer.getSequence(BitConverter.toHex(driveId));
        if (sequence && sequence.getStatus() == Status.Active)
            throw new Error("Device is already authorized");
        if (authConfigFile == null || !await authConfigFile.exists())
            throw new Error("Could not import file");
        let authConfig = await __classPrivateFieldGet(_a, _a, "m", _AuthConfig_getAuthConfig).call(_a, drive, authConfigFile);
        let authIdBytes = await drive.getAuthIdBytes();
        if (!authConfig.getAuthId().every((val, index) => val === authIdBytes[index])
            || !authConfig.getDriveId().every((val, index) => driveId && val == driveId[index]))
            throw new Error("Auth file doesn't match driveId or authId");
        await __classPrivateFieldGet(_a, _a, "m", _AuthConfig_importSequence).call(_a, drive, authConfig);
    }
    /**
     * @param {AesDrive} drive The drive
     * @param {string} targetAuthId The authorization id of the target device.
     * @param {IFile} file     The file
     * @throws Exception If an error occurs during export
     */
    static async exportAuthFile(drive, targetAuthId, file) {
        let sequencer = drive.getSequencer();
        if (!sequencer)
            throw new Error("No sequencer defined");
        let driveId = drive.getDriveId();
        if (driveId == null)
            throw new Error("Could not get drive id, make sure you init the drive first");
        let cfgNonce = await sequencer.nextNonce(BitConverter.toHex(driveId));
        if (cfgNonce == null)
            throw new Error("Could not get config nonce");
        let sequence = await sequencer.getSequence(BitConverter.toHex(driveId));
        if (sequence == null)
            throw new Error("Device is not authorized to export");
        if (await file.exists() && await file.getLength() > 0) {
            let outStream = null;
            try {
                outStream = await file.getOutputStream();
                await outStream.setLength(0);
            }
            catch (ex) {
            }
            finally {
                if (outStream)
                    await outStream.close();
            }
        }
        let maxNonce = sequence.getMaxNonce();
        if (maxNonce == null)
            throw new SequenceException("Could not get current max nonce");
        let nextNonce = sequence.getNextNonce();
        if (nextNonce == null)
            throw new SequenceException("Could not get next nonce");
        let pivotNonce = Nonce.splitNonceRange(nextNonce, maxNonce);
        let authId = sequence.getAuthId();
        if (authId == null)
            throw new SequenceException("Could not get auth id");
        await sequencer.setMaxNonce(sequence.getId(), authId, pivotNonce);
        await __classPrivateFieldGet(_a, _a, "m", _AuthConfig_writeAuthFile).call(_a, file, drive, BitConverter.hexToBytes(targetAuthId), pivotNonce, maxNonce, cfgNonce);
    }
}
_a = AuthConfig, _AuthConfig_driveId = new WeakMap(), _AuthConfig_authId = new WeakMap(), _AuthConfig_startNonce = new WeakMap(), _AuthConfig_maxNonce = new WeakMap(), _AuthConfig_writeAuthFile = async function _AuthConfig_writeAuthFile(authConfigFile, drive, targetAuthId, targetStartingNonce, targetMaxNonce, configNonce) {
    let driveId = drive.getDriveId();
    if (driveId == null)
        throw new Error("Could not write auth file, no drive id found");
    let aesFile = new AesFile(authConfigFile, drive);
    let stream = await aesFile.getOutputStream(configNonce);
    await __classPrivateFieldGet(_a, _a, "m", _AuthConfig_writeToStream).call(_a, stream, driveId, targetAuthId, targetStartingNonce, targetMaxNonce);
}, _AuthConfig_writeToStream = async function _AuthConfig_writeToStream(stream, driveId, authId, nextNonce, maxNonce) {
    let ms = new MemoryStream();
    try {
        await ms.write(driveId, 0, driveId.length);
        await ms.write(authId, 0, authId.length);
        await ms.write(nextNonce, 0, nextNonce.length);
        await ms.write(maxNonce, 0, maxNonce.length);
        let content = ms.toArray();
        let buffer = new Uint8Array(Integrity.DEFAULT_CHUNK_SIZE);
        for (let i = 0; i < content.length; i++)
            buffer[i] = content[i];
        await stream.write(buffer, 0, content.length);
    }
    catch (ex) {
        console.error(ex);
        throw new AuthException("Could not write auth config", ex);
    }
    finally {
        await ms.close();
        await stream.flush();
        await stream.close();
    }
}, _AuthConfig_getAuthConfig = async function _AuthConfig_getAuthConfig(drive, authFile) {
    let aesFile = new AesFile(authFile, drive);
    let stream = await aesFile.getInputStream();
    let ms = new MemoryStream();
    await stream.copyTo(ms);
    await ms.close();
    await stream.close();
    let driveConfig = new _a();
    await driveConfig.init(ms.toArray());
    if (!await __classPrivateFieldGet(_a, _a, "m", _AuthConfig_verifyAuthId).call(_a, drive, driveConfig.getAuthId()))
        throw new SecurityException("Could not authorize this device, the authorization id does not match");
    return driveConfig;
}, _AuthConfig_verifyAuthId = async function _AuthConfig_verifyAuthId(drive, authId) {
    let authIdBytes = await drive.getAuthIdBytes();
    return authId.every(async (val, index) => val === authIdBytes[index]);
}, _AuthConfig_importSequence = async function _AuthConfig_importSequence(drive, authConfig) {
    let sequencer = drive.getSequencer();
    if (!sequencer)
        throw new Error("No sequencer defined");
    let drvStr = BitConverter.toHex(authConfig.getDriveId());
    let authStr = BitConverter.toHex(authConfig.getAuthId());
    await sequencer.initializeSequence(drvStr, authStr, authConfig.getStartNonce(), authConfig.getMaxNonce());
};
