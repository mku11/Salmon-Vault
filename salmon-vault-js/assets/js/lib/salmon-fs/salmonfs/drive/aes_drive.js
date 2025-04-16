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
var _AesDrive_instances, _a, _AesDrive_configFilename, _AesDrive_authConfigFilename, _AesDrive_virtualDriveDirectoryName, _AesDrive_shareDirectoryName, _AesDrive_exportDirectoryName, _AesDrive_defaultFileChunkSize, _AesDrive_key, _AesDrive_driveId, _AesDrive_realRoot, _AesDrive_virtualRoot, _AesDrive_hashProvider, _AesDrive_sequencer, _AesDrive_registerOnProcessClose, _AesDrive_unlock, _AesDrive_verifyHash, _AesDrive_getDriveConfigFile, _AesDrive_createDriveInstance, _AesDrive_createConfig;
import { HmacSHA256Provider } from "../../../salmon-core/salmon/integrity/hmac_sha256_provider.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { DriveKey } from "./drive_key.js";
import { DriveGenerator } from "./drive_generator.js";
import { Integrity } from "../../../salmon-core/salmon/integrity/integrity.js";
import { DriveConfig } from "./drive_config.js";
import { MemoryStream } from "../../../salmon-core/streams/memory_stream.js";
import { AesStream } from "../../../salmon-core/salmon/streams/aes_stream.js";
import { EncryptionMode } from "../../../salmon-core/salmon/streams/encryption_mode.js";
import { EncryptionFormat } from "../../../salmon-core/salmon/streams/encryption_format.js";
import { SecurityException } from "../../../salmon-core/salmon/security_exception.js";
import { AuthException } from "../auth/auth_exception.js";
import { Password } from "../../../salmon-core/salmon/password/password.js";
import { VirtualDrive } from "../../fs/drive/virtual_drive.js";
import { BitConverter } from "../../../salmon-core/convert/bit_converter.js";
/**
 * Class provides an abstract virtual drive that can be extended for use with
 * any filesystem ie disk, net, cloud, etc.
 * Each drive implementation needs a corresponding implementation of {@link IFile}.
 */
export class AesDrive extends VirtualDrive {
    constructor() {
        super(...arguments);
        _AesDrive_instances.add(this);
        _AesDrive_defaultFileChunkSize.set(this, Integrity.DEFAULT_CHUNK_SIZE);
        _AesDrive_key.set(this, null);
        _AesDrive_driveId.set(this, null);
        _AesDrive_realRoot.set(this, null);
        _AesDrive_virtualRoot.set(this, null);
        _AesDrive_hashProvider.set(this, new HmacSHA256Provider());
        _AesDrive_sequencer.set(this, void 0);
    }
    async initialize(realRoot, createIfNotExists) {
        this.close();
        if (realRoot == null)
            return;
        __classPrivateFieldSet(this, _AesDrive_realRoot, realRoot, "f");
        let parent = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getParent();
        if (parent && !createIfNotExists && !await this.hasConfig() && await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getParent() && await parent.exists()) {
            // try the parent if this is the filesystem folder 
            let originalRealRoot = __classPrivateFieldGet(this, _AesDrive_realRoot, "f");
            __classPrivateFieldSet(this, _AesDrive_realRoot, parent, "f");
            if (!await this.hasConfig()) {
                // revert to original
                __classPrivateFieldSet(this, _AesDrive_realRoot, originalRealRoot, "f");
            }
        }
        if (__classPrivateFieldGet(this, _AesDrive_realRoot, "f") == null)
            throw new Error("Could not initialize root folder");
        let virtualRootRealFile = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getChild(__classPrivateFieldGet(_a, _a, "f", _AesDrive_virtualDriveDirectoryName));
        if (createIfNotExists && (virtualRootRealFile == null || !await virtualRootRealFile.exists())) {
            virtualRootRealFile = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").createDirectory(__classPrivateFieldGet(_a, _a, "f", _AesDrive_virtualDriveDirectoryName));
        }
        if (virtualRootRealFile == null)
            throw new Error("Could not create directory for the virtual file system");
        __classPrivateFieldSet(this, _AesDrive_virtualRoot, this.getVirtualFile(virtualRootRealFile), "f");
        __classPrivateFieldGet(this, _AesDrive_instances, "m", _AesDrive_registerOnProcessClose).call(this);
        __classPrivateFieldSet(this, _AesDrive_key, new DriveKey(), "f");
    }
    static getConfigFilename() {
        return __classPrivateFieldGet(this, _a, "f", _AesDrive_configFilename);
    }
    static setConfigFilename(configFilename) {
        __classPrivateFieldSet(_a, _a, configFilename, "f", _AesDrive_configFilename);
    }
    static getAuthConfigFilename() {
        return __classPrivateFieldGet(this, _a, "f", _AesDrive_authConfigFilename);
    }
    static setAuthConfigFilename(authConfigFilename) {
        __classPrivateFieldSet(_a, _a, authConfigFilename, "f", _AesDrive_authConfigFilename);
    }
    static getVirtualDriveDirectoryName() {
        return __classPrivateFieldGet(this, _a, "f", _AesDrive_virtualDriveDirectoryName);
    }
    static setVirtualDriveDirectoryName(virtualDriveDirectoryName) {
        __classPrivateFieldSet(_a, _a, virtualDriveDirectoryName, "f", _AesDrive_virtualDriveDirectoryName);
    }
    static getExportDirectoryName() {
        return __classPrivateFieldGet(_a, _a, "f", _AesDrive_exportDirectoryName);
    }
    static setExportDirectoryName(exportDirectoryName) {
        __classPrivateFieldSet(_a, _a, exportDirectoryName, "f", _AesDrive_exportDirectoryName);
    }
    static getShareDirectoryName() {
        return __classPrivateFieldGet(this, _a, "f", _AesDrive_shareDirectoryName);
    }
    static setShareDirectoryName(shareDirectoryName) {
        __classPrivateFieldSet(_a, _a, shareDirectoryName, "f", _AesDrive_shareDirectoryName);
    }
    /**
     * Return the default file chunk size
     * @returns {number} The default chunk size.
     */
    getDefaultFileChunkSize() {
        return __classPrivateFieldGet(this, _AesDrive_defaultFileChunkSize, "f");
    }
    /**
     * Set the default file chunk size to be used with hash integrity.
     * @param {number} fileChunkSize
     */
    setDefaultFileChunkSize(fileChunkSize) {
        __classPrivateFieldSet(this, _AesDrive_defaultFileChunkSize, fileChunkSize, "f");
    }
    /**
     * Return the encryption key that is used for encryption / decryption
     * @returns {DriveKey | null} The drive key
     */
    getKey() {
        return __classPrivateFieldGet(this, _AesDrive_key, "f");
    }
    /**
     * Return the virtual root directory of the drive.
     * @returns {Promise<IVirtualFile | null>} The virtual file
     * @throws SalmonAuthException Thrown when error during authorization
     */
    async getRoot() {
        if (__classPrivateFieldGet(this, _AesDrive_realRoot, "f") == null || !await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").exists())
            return null;
        if (__classPrivateFieldGet(this, _AesDrive_virtualRoot, "f") == null)
            throw new SecurityException("No virtual root, make sure you init the drive first");
        return __classPrivateFieldGet(this, _AesDrive_virtualRoot, "f");
    }
    getRealRoot() {
        return __classPrivateFieldGet(this, _AesDrive_realRoot, "f");
    }
    /**
     * Sets the key properties.
     * @param {Uint8Array} masterKey The master key.
     * @param {Uint8Array} driveKey The drive key used for enc/dec of files and filenames.
     * @param {Uint8Array} hashKey The hash key used for data integrity.
     * @param {number} iterations The iterations
     */
    setKey(masterKey, driveKey, hashKey, iterations) {
        if (__classPrivateFieldGet(this, _AesDrive_key, "f") == null)
            throw new Error("You need to init the drive first");
        __classPrivateFieldGet(this, _AesDrive_key, "f").setMasterKey(masterKey);
        __classPrivateFieldGet(this, _AesDrive_key, "f").setDriveKey(driveKey);
        __classPrivateFieldGet(this, _AesDrive_key, "f").setHashKey(hashKey);
        __classPrivateFieldGet(this, _AesDrive_key, "f").setIterations(iterations);
    }
    /**
     * Get the next nonce from the sequencer. This advanced the sequencer so unique nonce are used.
     * @returns {Promise<Uint8Array | null>} The next nonce.
     * @throws Exception
     */
    async getNextNonce() {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new AuthException("No sequencer found");
        let driveId = this.getDriveId();
        if (driveId == null)
            throw new SecurityException("Could not get drive Id");
        return await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").nextNonce(BitConverter.toHex(driveId));
    }
    /**
     * Get the byte contents of a file from the real filesystem.
     *
     * @param {IFile} file The file
     * @param {Uint8Array} bufferSize The buffer to be used when reading
     */
    async getBytesFromRealFile(file, bufferSize) {
        let stream = await file.getInputStream();
        let ms = new MemoryStream();
        await stream.copyTo(ms, bufferSize);
        await ms.flush();
        await ms.setPosition(0);
        let byteContents = ms.toArray();
        await ms.close();
        await stream.close();
        return byteContents;
    }
    /**
     * Return the default external export dir that all file can be exported to.
     * @returns {Promise<IFile>} The file on the real filesystem.
     */
    async getExportDir() {
        if (__classPrivateFieldGet(this, _AesDrive_realRoot, "f") == null)
            throw new SecurityException("Cannot export, make sure you init the drive first");
        let exportDir = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getChild(__classPrivateFieldGet(_a, _a, "f", _AesDrive_exportDirectoryName));
        if (exportDir == null || !await exportDir.exists())
            exportDir = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").createDirectory(__classPrivateFieldGet(_a, _a, "f", _AesDrive_exportDirectoryName));
        return exportDir;
    }
    /**
     * Return the configuration properties of this drive.
     * @returns {Promise<DriveConfig | null>} The configuration
     */
    async getDriveConfig() {
        let configFile = await __classPrivateFieldGet(this, _AesDrive_instances, "m", _AesDrive_getDriveConfigFile).call(this);
        if (configFile == null || !await configFile.exists())
            return null;
        let bytes = await this.getBytesFromRealFile(configFile, 0);
        let driveConfig = new DriveConfig();
        await driveConfig.init(bytes);
        return driveConfig;
    }
    /**
     * Return true if the drive is already created and has a configuration file.
     * @returns {Promise<boolean>} True if configuration file was found
     */
    async hasConfig() {
        let salmonConfig = null;
        try {
            salmonConfig = await this.getDriveConfig();
        }
        catch (ex) {
            console.error(ex);
            return false;
        }
        return salmonConfig != null;
    }
    /**
     * Get the drive id.
     * @returns {Uint8Array | null} The drive id.
     */
    getDriveId() {
        return __classPrivateFieldGet(this, _AesDrive_driveId, "f");
    }
    /**
     * Close the drive and associated resources.
     */
    close() {
        __classPrivateFieldSet(this, _AesDrive_realRoot, null, "f");
        __classPrivateFieldSet(this, _AesDrive_virtualRoot, null, "f");
        __classPrivateFieldSet(this, _AesDrive_driveId, null, "f");
        if (__classPrivateFieldGet(this, _AesDrive_key, "f"))
            __classPrivateFieldGet(this, _AesDrive_key, "f").clear();
        __classPrivateFieldSet(this, _AesDrive_key, null, "f");
    }
    /**
     * Initialize the drive virtual filesystem.
     */
    async initFS() {
        if (__classPrivateFieldGet(this, _AesDrive_realRoot, "f") == null)
            throw new SecurityException("Could not initialize virtual file system, make sure you run init first");
        let virtualRootRealFile = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getChild(__classPrivateFieldGet(_a, _a, "f", _AesDrive_virtualDriveDirectoryName));
        if (virtualRootRealFile == null || !await virtualRootRealFile.exists()) {
            try {
                virtualRootRealFile = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").createDirectory(__classPrivateFieldGet(_a, _a, "f", _AesDrive_virtualDriveDirectoryName));
            }
            catch (ex) {
                console.error(ex);
            }
        }
        if (virtualRootRealFile)
            __classPrivateFieldSet(this, _AesDrive_virtualRoot, this.getVirtualFile(virtualRootRealFile), "f");
    }
    /**
     * Get the has provider for this drive.
     * @returns {IHashProvider} The hash provider
     */
    getHashProvider() {
        return __classPrivateFieldGet(this, _AesDrive_hashProvider, "f");
    }
    /**
     * Set the drive location to an external directory.
     * This requires you previously use SetDriveClass() to provide a class for the drive
     *
     * @param {IFile} dir The directory path that will be used for storing the contents of the drive
     * @param {any} driveClassType The driver class type (ie Drive).
     * @param {string} password Text password to encrypt the drive configuration.
     * @param {INonceSequencer} [sequencer] The sequencer to use.
     * @returns {Promise<AesDrive>} The drive
     */
    static async openDrive(dir, driveClassType, password, sequencer) {
        let drive = await __classPrivateFieldGet(_a, _a, "m", _AesDrive_createDriveInstance).call(_a, dir, false, driveClassType, sequencer);
        if (!await drive.hasConfig()) {
            throw new Error("Drive does not exist");
        }
        await __classPrivateFieldGet(drive, _AesDrive_instances, "m", _AesDrive_unlock).call(drive, password);
        return drive;
    }
    /**
     * Create a new drive in the provided location.
     *
     * @param {IFile} dir  Directory to store the drive configuration and virtual filesystem.
     * @param {any} driveClassType The driver class type (ie Drive).
     * @param {string} password Text password to encrypt the drive configuration.
     * @param {INonceSequencer} sequencer The sequencer to use.
     * @returns {Promise<AesDrive>} The newly created drive.
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     * @throws SequenceException Thrown if error with the nonce sequence
     */
    static async createDrive(dir, driveClassType, password, sequencer) {
        let drive = await __classPrivateFieldGet(_a, _a, "m", _AesDrive_createDriveInstance).call(_a, dir, true, driveClassType, sequencer);
        if (await drive.hasConfig())
            throw new SecurityException("Drive already exists");
        await drive.setPassword(password);
        return drive;
    }
    /**
     * Get the device authorization byte array for the current drive.
     *
     * @returns {Promise<Uint8Array>} The byte array with the auth id
     * @throws Exception If error occurs during retrieval
     */
    async getAuthIdBytes() {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new Error("No sequencer defined");
        let driveId = this.getDriveId();
        if (driveId == null)
            throw new Error("Could not get drive id, make sure you init the drive first");
        let drvStr = BitConverter.toHex(driveId);
        let sequence = await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").getSequence(drvStr);
        if (sequence == null) {
            let authId = DriveGenerator.generateAuthId();
            await this.createSequence(driveId, authId);
        }
        sequence = await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").getSequence(drvStr);
        if (sequence == null)
            throw new Error("Could not get sequence");
        let authId = sequence.getAuthId();
        if (authId == null)
            throw new Error("Could not get auth id");
        return BitConverter.hexToBytes(authId);
    }
    /**
     * Get the default auth config filename.
     *
     * @returns {string} The authorization configuration file name.
     */
    static getDefaultAuthConfigFilename() {
        return _a.getAuthConfigFilename();
    }
    /**
     * Create a nonce sequence for the drive id and the authorization id provided. Should be called
     * once per driveId/authId combination.
     *
     * @param {Uint8Array} driveId The driveId
     * @param {Uint8Array} authId  The authId
     * @throws Exception If error occurs during creation
     */
    async createSequence(driveId, authId) {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new Error("No sequencer defined");
        let drvStr = BitConverter.toHex(driveId);
        let authStr = BitConverter.toHex(authId);
        await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").createSequence(drvStr, authStr);
    }
    /**
     * Initialize the nonce sequencer with the current drive nonce range. Should be called
     * once per driveId/authId combination.
     *
     * @param {Uint8Array} driveId Drive ID.
     * @param {Uint8Array} authId  Authorization ID.
     * @throws Exception If error occurs during initialization
     */
    async initializeSequence(driveId, authId) {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new Error("No sequencer defined");
        let startingNonce = DriveGenerator.getStartingNonce();
        let maxNonce = DriveGenerator.getMaxNonce();
        let drvStr = BitConverter.toHex(driveId);
        let authStr = BitConverter.toHex(authId);
        await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").initializeSequence(drvStr, authStr, startingNonce, maxNonce);
    }
    /**
     * Revoke authorization for this device. This will effectively terminate write operations on the current disk
     * by the current device. Warning: If you need to authorize write operations to the device again you will need
     * to have another device to export an authorization config file and reimport it.
     *
     * @throws Exception If error occurs during revoke.
     * @see <a href="https://github.com/mku11/Salmon-AES-CTR#readme">Salmon README.md</a>
     */
    async revokeAuthorization() {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new Error("No sequencer defined");
        let driveId = this.getDriveId();
        if (driveId == null)
            throw new Error("Could not get revoke, make sure you initialize the drive first");
        await __classPrivateFieldGet(this, _AesDrive_sequencer, "f").revokeSequence(BitConverter.toHex(driveId));
    }
    /**
     * Get the authorization ID for the current device.
     *
     * @returns {Promise<string>} The auth id
     * @throws SequenceException Thrown if error with the nonce sequence
     * @throws SalmonAuthException Thrown when error during authorization
     */
    async getAuthId() {
        return BitConverter.toHex(await this.getAuthIdBytes());
    }
    /**
     * Change the user password.
     * @param {string} pass The new password.
     * @throws IOException Thrown if there is an IO error.
     * @throws SalmonAuthException Thrown when error during authorization
     * @throws SalmonSecurityException Thrown when error with security
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     * @throws SequenceException Thrown if error with the nonce sequence
     */
    async setPassword(pass) {
        await __classPrivateFieldGet(this, _AesDrive_instances, "m", _AesDrive_createConfig).call(this, pass);
    }
    /**
     * Get the nonce sequencer used for the current drive.
     *
     * @returns {INonceSequencer | undefined} The nonce sequencer
     */
    getSequencer() {
        if (!__classPrivateFieldGet(this, _AesDrive_sequencer, "f"))
            throw new Error("Could not find a sequencer");
        return __classPrivateFieldGet(this, _AesDrive_sequencer, "f");
    }
    /**
     * Set the nonce sequencer used for the current drive.
     *
     * @param {INonceSequencer | undefined} sequencer The nonce sequencer
     */
    setSequencer(sequencer) {
        __classPrivateFieldSet(this, _AesDrive_sequencer, sequencer, "f");
    }
    /**
     * Create the config file for this drive. By default the config file is placed in the real root of the vault.
     * You can override this with your own location, make sure you also override getConfigFile().
     * @param {IFile} realRoot The real root directory of the vault
     * @returns {Promise<IFile>} The config file that was created
     */
    async createConfigFile(realRoot) {
        let configFile = await realRoot.createFile(_a.getConfigFilename());
        return configFile;
    }
    /**
     * Get the config file for this drive. By default the config file is placed in the real root of the vault.
     * You can override this with your own location.
     * @param {IFile} realRoot The real root directory of the vault
     * @returns {Promise<IFile | null>} The config file that will be used for this drive.
     */
    async getConfigFile(realRoot) {
        let configFile = await realRoot.getChild(_a.getConfigFilename());
        return configFile;
    }
}
_a = AesDrive, _AesDrive_defaultFileChunkSize = new WeakMap(), _AesDrive_key = new WeakMap(), _AesDrive_driveId = new WeakMap(), _AesDrive_realRoot = new WeakMap(), _AesDrive_virtualRoot = new WeakMap(), _AesDrive_hashProvider = new WeakMap(), _AesDrive_sequencer = new WeakMap(), _AesDrive_instances = new WeakSet(), _AesDrive_registerOnProcessClose = function _AesDrive_registerOnProcessClose() {
    // TODO: exec close() on exit
}, _AesDrive_unlock = 
/**
 * Verify if the user password is correct otherwise it throws a SalmonAuthException
 *
 * @param {string} password The password.
 */
async function _AesDrive_unlock(password) {
    let stream = null;
    try {
        if (password == null) {
            throw new SecurityException("Password is missing");
        }
        let salmonConfig = await this.getDriveConfig();
        if (salmonConfig == null)
            throw new SecurityException("Could not get drive config");
        let iterations = salmonConfig.getIterations();
        let salt = salmonConfig.getSalt();
        // derive the master key from the text password
        let masterKey = await Password.getMasterKey(password, salt, iterations, DriveGenerator.MASTER_KEY_LENGTH);
        // get the master Key Iv
        let masterKeyIv = salmonConfig.getIv();
        // get the encrypted combined key and drive id
        let encData = salmonConfig.getEncryptedData();
        // decrypt the combined key (drive key + hash key) using the master key
        let ms = new MemoryStream(encData);
        stream = new AesStream(masterKey, masterKeyIv, EncryptionMode.Decrypt, ms, EncryptionFormat.Generic);
        let driveKey = new Uint8Array(Generator.KEY_LENGTH);
        await stream.read(driveKey, 0, driveKey.length);
        let hashKey = new Uint8Array(Generator.HASH_KEY_LENGTH);
        await stream.read(hashKey, 0, hashKey.length);
        let driveId = new Uint8Array(DriveGenerator.DRIVE_ID_LENGTH);
        await stream.read(driveId, 0, driveId.length);
        // to make sure we have the right key we get the hash portion
        // and try to verify the drive nonce
        await __classPrivateFieldGet(this, _AesDrive_instances, "m", _AesDrive_verifyHash).call(this, salmonConfig, encData, hashKey);
        // set the combined key (drive key + hash key) and the drive nonce
        this.setKey(masterKey, driveKey, hashKey, iterations);
        __classPrivateFieldSet(this, _AesDrive_driveId, driveId, "f");
        await this.initFS();
        this.onUnlockSuccess();
    }
    catch (ex) {
        this.onUnlockError();
        throw ex;
    }
    finally {
        if (stream)
            await stream.close();
    }
}, _AesDrive_verifyHash = 
/**
 * Verify that the hash signature is correct
 *
 * @param {DriveConfig} salmonConfig The drive configuration
 * @param {Uint8Array} data The data
 * @param {Uint8Array} hashKey The hash key
 */
async function _AesDrive_verifyHash(salmonConfig, data, hashKey) {
    let hashSignature = salmonConfig.getHashSignature();
    let hash = await Integrity.calculateHash(__classPrivateFieldGet(this, _AesDrive_hashProvider, "f"), data, 0, data.length, hashKey, null);
    for (let i = 0; i < hashKey.length; i++)
        if (hashSignature[i] != hash[i])
            throw new AuthException("Wrong password");
}, _AesDrive_getDriveConfigFile = 
/**
 * Return the drive configuration file.
 * @returns {Promise<IFile | null>} The file
 */
async function _AesDrive_getDriveConfigFile() {
    if (__classPrivateFieldGet(this, _AesDrive_realRoot, "f") == null || !await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").exists())
        return null;
    let file = await __classPrivateFieldGet(this, _AesDrive_realRoot, "f").getChild(__classPrivateFieldGet(_a, _a, "f", _AesDrive_configFilename));
    return file;
}, _AesDrive_createDriveInstance = async function _AesDrive_createDriveInstance(dir, createIfNotExists, driveClassType, sequencer) {
    try {
        let drive = new driveClassType;
        await drive.initialize(dir, createIfNotExists);
        __classPrivateFieldSet(drive, _AesDrive_sequencer, sequencer, "f");
        if (__classPrivateFieldGet(drive, _AesDrive_sequencer, "f"))
            await __classPrivateFieldGet(drive, _AesDrive_sequencer, "f").initialize();
        return drive;
    }
    catch (e) {
        console.error(e);
        throw new SecurityException("Could not initialize the drive: " + e.message, e);
    }
}, _AesDrive_createConfig = 
/**
 * Create a configuration file for the drive.
 *
 * @param {string} password The new password to be saved in the configuration
 *                 This password will be used to derive the master key that will be used to
 *                 encrypt the combined key (encryption key + hash key)
 */
//TODO: partial refactor to SalmonDriveConfig
async function _AesDrive_createConfig(password) {
    let key = this.getKey();
    if (key == null)
        throw new Error("Cannot create config, no key found, make sure you init the drive first");
    let driveKey = key.getDriveKey();
    let hashKey = key.getHashKey();
    let realRoot = this.getRealRoot();
    if (realRoot == null)
        throw new Error("Cannot create config, no root found, make sure you init the drive first");
    let configFile = await this.getConfigFile(realRoot);
    if (driveKey == null && configFile && await configFile.exists())
        throw new AuthException("Not authenticated");
    // delete the old config file and create a new one
    if (configFile && await configFile.exists())
        await configFile.delete();
    configFile = await this.createConfigFile(realRoot);
    if (configFile == null)
        throw new AuthException("Could not crete config file");
    let magicBytes = Generator.getMagicBytes();
    let version = Generator.getVersion();
    // if this is a new config file derive a 512-bit key that will be split to:
    // a) drive encryption key (for encrypting filenames and files)
    // b) hash key for file integrity
    let newDrive = false;
    if (driveKey == null) {
        newDrive = true;
        driveKey = new Uint8Array(Generator.KEY_LENGTH);
        hashKey = new Uint8Array(Generator.HASH_KEY_LENGTH);
        let combKey = DriveGenerator.generateCombinedKey();
        for (let i = 0; i < Generator.KEY_LENGTH; i++)
            driveKey[i] = combKey[i];
        for (let i = 0; i < Generator.HASH_KEY_LENGTH; i++)
            driveKey[i] = combKey[Generator.KEY_LENGTH + i];
        __classPrivateFieldSet(this, _AesDrive_driveId, DriveGenerator.generateDriveID(), "f");
    }
    // Get the salt that we will use to encrypt the combined key (drive key + hash key)
    let salt = DriveGenerator.generateSalt();
    let iterations = DriveGenerator.getIterations();
    // generate a 128 bit IV that will be used with the master key to encrypt the combined 64-bit key (drive key + hash key)
    let masterKeyIv = DriveGenerator.generateMasterKeyIV();
    // create a key that will encrypt both the (drive key and the hash key)
    let masterKey = await Password.getMasterKey(password, salt, iterations, DriveGenerator.MASTER_KEY_LENGTH);
    let driveId = this.getDriveId();
    if (driveKey == null || hashKey == null || driveId == null)
        throw new Error("Make sure you init the drive first");
    // encrypt the combined key (drive key + hash key) using the masterKey and the masterKeyIv
    let ms = new MemoryStream();
    let stream = new AesStream(masterKey, masterKeyIv, EncryptionMode.Encrypt, ms, EncryptionFormat.Generic);
    await stream.write(driveKey, 0, driveKey.length);
    await stream.write(hashKey, 0, hashKey.length);
    await stream.write(driveId, 0, driveId.length);
    await stream.flush();
    await stream.close();
    let encData = ms.toArray();
    // generate the hash signature
    let hashSignature = await Integrity.calculateHash(this.getHashProvider(), encData, 0, encData.length, hashKey, null);
    await DriveConfig.writeDriveConfig(configFile, magicBytes, version, salt, iterations, masterKeyIv, encData, hashSignature);
    this.setKey(masterKey, driveKey, hashKey, iterations);
    if (newDrive) {
        // create a full sequence for nonces
        let authId = DriveGenerator.generateAuthId();
        await this.createSequence(driveId, authId);
        await this.initializeSequence(driveId, authId);
    }
    await this.initFS();
};
_AesDrive_configFilename = { value: "vault.slmn" };
_AesDrive_authConfigFilename = { value: "auth.slma" };
_AesDrive_virtualDriveDirectoryName = { value: "fs" };
_AesDrive_shareDirectoryName = { value: "share" };
_AesDrive_exportDirectoryName = { value: "export" };
