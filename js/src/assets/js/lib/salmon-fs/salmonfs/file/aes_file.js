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
var _AesFile_instances, _a, _AesFile_drive, _AesFile_format, _AesFile_realFile, _AesFile__baseName, _AesFile__header, _AesFile_overwrite, _AesFile_integrity, _AesFile_reqChunkSize, _AesFile_encryptionKey, _AesFile_hashKey, _AesFile_requestedNonce, _AesFile_tag, _AesFile_getRealFileHeaderData, _AesFile_getChunkSizeLength, _AesFile_getHeaderLength, _AesFile_getPath, _AesFile_getRelativePath, _AesFile_getHashTotalBytesLength, _AesFile_getDecryptedFilename;
import { BitConverter } from "../../../salmon-core/convert/bit_converter.js";
import { IOException } from "../../../salmon-core/streams/io_exception.js";
import { SeekOrigin } from "../../../salmon-core/streams/random_access_stream.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { Header } from "../../../salmon-core/salmon/header.js";
import { AesStream } from "../../../salmon-core/salmon/streams/aes_stream.js";
import { autoRename as IFileAutoRename, copyRecursively as IFileCopyRecursively, moveRecursively as IFileMoveRecursively, deleteRecursively as IFileDeleteRecursively, RecursiveCopyOptions, RecursiveMoveOptions, RecursiveDeleteOptions } from "../../fs/file/ifile.js";
import { EncryptionMode } from "../../../salmon-core/salmon/streams/encryption_mode.js";
import { EncryptionFormat } from "../../../salmon-core/salmon/streams/encryption_format.js";
import { SecurityException } from "../../../salmon-core/salmon/security_exception.js";
import { IntegrityException } from "../../../salmon-core/salmon/integrity/integrity_exception.js";
import { TextDecryptor } from "../../../salmon-core/salmon/text/text_decryptor.js";
import { TextEncryptor } from "../../../salmon-core/salmon/text/text_encryptor.js";
import { Integrity } from "../../../salmon-core/salmon/integrity/integrity.js";
import { VirtualRecursiveCopyOptions, VirtualRecursiveMoveOptions, VirtualRecursiveDeleteOptions } from "../../fs/file/ivirtual_file.js";
/**
 * A virtual file backed by an encrypted {@link IFile} on the real filesystem.
 * Supports operations for retrieving {@link AesStream} for reading/decrypting
 * and writing/encrypting contents.
 */
export class AesFile {
    /**
     * Provides a file handle that can be used to create encrypted files.
     * Requires a virtual drive that supports the underlying filesystem see IFile.
     *
     * @param {IFile} realFile The real file
     * @param {AesDrive} [drive]    The file virtual system that will be used with file operations.
     * You usually don't have to set this since it will inherit from its parent.
     */
    constructor(realFile, drive, format = EncryptionFormat.Salmon) {
        _AesFile_instances.add(this);
        _AesFile_drive.set(this, void 0);
        _AesFile_format.set(this, void 0);
        _AesFile_realFile.set(this, void 0);
        //cached values
        _AesFile__baseName.set(this, null);
        _AesFile__header.set(this, null);
        _AesFile_overwrite.set(this, false);
        _AesFile_integrity.set(this, false);
        _AesFile_reqChunkSize.set(this, 0);
        _AesFile_encryptionKey.set(this, null);
        _AesFile_hashKey.set(this, null);
        _AesFile_requestedNonce.set(this, null);
        _AesFile_tag.set(this, null);
        __classPrivateFieldSet(this, _AesFile_realFile, realFile, "f");
        __classPrivateFieldSet(this, _AesFile_drive, drive, "f");
        __classPrivateFieldSet(this, _AesFile_format, format, "f");
        if (__classPrivateFieldGet(this, _AesFile_integrity, "f") && drive)
            __classPrivateFieldSet(this, _AesFile_reqChunkSize, drive.getDefaultFileChunkSize(), "f");
        if (drive != null && drive.getKey()) {
            let key = drive.getKey();
            if (key)
                __classPrivateFieldSet(this, _AesFile_hashKey, key.getHashKey(), "f");
        }
    }
    /**
     * Return if integrity is set
     */
    isIntegrityEnabled() {
        return __classPrivateFieldGet(this, _AesFile_integrity, "f");
    }
    /**
     * Return the current chunk size requested that will be used for integrity
     */
    getRequestedChunkSize() {
        return __classPrivateFieldGet(this, _AesFile_reqChunkSize, "f");
    }
    /**
     * Get the file chunk size from the header.
     *
     * @returns {Promise<number>} The chunk size.
     * @throws IOException Throws exceptions if the format is corrupt.
     */
    async getFileChunkSize() {
        let header = await this.getHeader();
        if (header == null)
            return 0;
        return header.getChunkSize();
    }
    /**
     * Get the custom {@link Header} from this file.
     *
     * @returns {Promise<Header | null>} The header
     * @throws IOException Thrown if there is an IO error.
     */
    async getHeader() {
        if (!(await this.exists()))
            return null;
        if (__classPrivateFieldGet(this, _AesFile__header, "f"))
            return __classPrivateFieldGet(this, _AesFile__header, "f");
        let header = new Header(new Uint8Array());
        let stream = null;
        try {
            stream = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getInputStream();
            header = await Header.readHeaderData(stream);
        }
        catch (ex) {
            console.error(ex);
            throw new IOException("Could not get file header", ex);
        }
        finally {
            if (stream) {
                await stream.close();
            }
        }
        __classPrivateFieldSet(this, _AesFile__header, header, "f");
        return header;
    }
    /**
     * Retrieves a SalmonStream that will be used for decrypting the file contents.
     *
     * @returns {Promise<AesStream>} The stream
     * @throws IOException Thrown if there is an IO error.
     * @throws SalmonSecurityException Thrown when error with security
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    async getInputStream() {
        if (!(await this.exists()))
            throw new IOException("File does not exist");
        let realStream = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getInputStream();
        await realStream.seek(Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH, SeekOrigin.Begin);
        let fileChunkSizeBytes = new Uint8Array(__classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getChunkSizeLength).call(this));
        let bytesRead = await realStream.read(fileChunkSizeBytes, 0, fileChunkSizeBytes.length);
        if (bytesRead == 0)
            throw new IOException("Could not parse chunks size from file header");
        let chunkSize = BitConverter.toLong(fileChunkSizeBytes, 0, 4);
        if (__classPrivateFieldGet(this, _AesFile_integrity, "f") && chunkSize == 0)
            throw new SecurityException("Cannot check integrity if file doesn't support it");
        let nonceBytes = new Uint8Array(Generator.NONCE_LENGTH);
        let ivBytesRead = await realStream.read(nonceBytes, 0, nonceBytes.length);
        if (ivBytesRead == 0)
            throw new IOException("Could not parse nonce from file header");
        await realStream.setPosition(0);
        let headerData = new Uint8Array(__classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getHeaderLength).call(this));
        await realStream.read(headerData, 0, headerData.length);
        let key = this.getEncryptionKey();
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        let stream = new AesStream(key, nonceBytes, EncryptionMode.Decrypt, realStream, __classPrivateFieldGet(this, _AesFile_format, "f"), __classPrivateFieldGet(this, _AesFile_integrity, "f"), this.getHashKey());
        return stream;
    }
    /**
     * Get a {@link AesStream} for encrypting/writing contents to this file.
     *
     * @param {Uint8Array | null} nonce Nonce to be used for encryption. Note that each file should have
     *              a unique nonce see {@link AesDrive#getNextNonce()}.
     * @returns {Promise<AesStream>} The output stream.
     * @throws Exception
     */
    async getOutputStream(nonce = null) {
        // check if we have an existing iv in the header
        let nonceBytes = await this.getFileNonce();
        if (nonceBytes != null && !__classPrivateFieldGet(this, _AesFile_overwrite, "f"))
            throw new SecurityException("You should not overwrite existing files for security instead delete the existing file and create a new file. If this is a new file and you want to use parallel streams you can   this with SetAllowOverwrite(true)");
        if (nonceBytes == null) {
            // set it to zero (disabled integrity) or get the default chunk
            // size defined by the drive
            if (__classPrivateFieldGet(this, _AesFile_integrity, "f") && __classPrivateFieldGet(this, _AesFile_reqChunkSize, "f") == null && __classPrivateFieldGet(this, _AesFile_drive, "f"))
                __classPrivateFieldSet(this, _AesFile_reqChunkSize, __classPrivateFieldGet(this, _AesFile_drive, "f").getDefaultFileChunkSize(), "f");
            else if (!__classPrivateFieldGet(this, _AesFile_integrity, "f"))
                __classPrivateFieldSet(this, _AesFile_reqChunkSize, 0, "f");
            if (__classPrivateFieldGet(this, _AesFile_reqChunkSize, "f") == null)
                throw new IntegrityException("File requires a chunk size");
            if (nonce)
                __classPrivateFieldSet(this, _AesFile_requestedNonce, nonce, "f");
            else if (__classPrivateFieldGet(this, _AesFile_requestedNonce, "f") == null && __classPrivateFieldGet(this, _AesFile_drive, "f"))
                __classPrivateFieldSet(this, _AesFile_requestedNonce, await __classPrivateFieldGet(this, _AesFile_drive, "f").getNextNonce(), "f");
            if (__classPrivateFieldGet(this, _AesFile_requestedNonce, "f") == null)
                throw new SecurityException("File requires a nonce");
            nonceBytes = __classPrivateFieldGet(this, _AesFile_requestedNonce, "f");
        }
        // create a stream with the file chunk size specified which will be used to host the integrity hash
        // we also specify if stream ranges can be overwritten which is generally dangerous if the file is existing
        // but practical if the file is brand new and multithreaded writes for performance need to be used.
        let realStream = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getOutputStream();
        let key = this.getEncryptionKey();
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        if (nonceBytes == null)
            throw new IOException("No nonce provided and no nonce found in file");
        let stream = new AesStream(key, nonceBytes, EncryptionMode.Encrypt, realStream, __classPrivateFieldGet(this, _AesFile_format, "f"), __classPrivateFieldGet(this, _AesFile_integrity, "f"), this.getHashKey(), this.getRequestedChunkSize());
        stream.setAllowRangeWrite(__classPrivateFieldGet(this, _AesFile_overwrite, "f"));
        return stream;
    }
    /**
     * Returns the current encryption key
     * @returns {Uint8Array | null} The key
     */
    getEncryptionKey() {
        if (__classPrivateFieldGet(this, _AesFile_encryptionKey, "f"))
            return __classPrivateFieldGet(this, _AesFile_encryptionKey, "f");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let key = __classPrivateFieldGet(this, _AesFile_drive, "f").getKey();
            if (key)
                return key.getDriveKey();
        }
        return null;
    }
    /**
     * Sets the encryption key
     *
     * @param {Uint8Array | null} encryptionKey The AES encryption key to be used
     */
    setEncryptionKey(encryptionKey) {
        __classPrivateFieldSet(this, _AesFile_encryptionKey, encryptionKey, "f");
    }
    /**
     * Retrieve the current hash key that is used to encrypt / decrypt the file contents.
     * @returns {Uint8Array | null} The hash key.
     */
    getHashKey() {
        return __classPrivateFieldGet(this, _AesFile_hashKey, "f");
    }
    /**
     * Enabled verification of file integrity during read() and write()
     *
     * @param {boolean} integrity True if enable integrity verification
     * @param {Uint8Array | null} hashKey   The hash key to be used for verification
     */
    async setVerifyIntegrity(integrity, hashKey = null) {
        let header = await this.getHeader();
        if (header == null && integrity)
            throw new IntegrityException("File does not support integrity");
        if (integrity && hashKey == null && __classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let key = __classPrivateFieldGet(this, _AesFile_drive, "f").getKey();
            if (key)
                hashKey = key.getHashKey();
        }
        __classPrivateFieldSet(this, _AesFile_reqChunkSize, await this.getFileChunkSize(), "f");
        if (integrity && __classPrivateFieldGet(this, _AesFile_reqChunkSize, "f") == 0) {
            console.log("warning: cannot enable integrity because file does not contain integrity chunks");
            return;
        }
        __classPrivateFieldSet(this, _AesFile_integrity, integrity, "f");
        __classPrivateFieldSet(this, _AesFile_hashKey, hashKey, "f");
        if (header)
            __classPrivateFieldSet(this, _AesFile_reqChunkSize, header.getChunkSize(), "f");
    }
    /**
     * Appy integrity when writing to file.
     * @param {boolean} integrity True to apply integrity
     * @param {Uint8Array | null} hashKey The hash key
     * @param {number} requestChunkSize A positive number to specify integrity chunk size.
     */
    async setApplyIntegrity(integrity, hashKey = null, requestChunkSize = 0) {
        let header = await this.getHeader();
        if (header != null && header.getChunkSize() > 0 && !__classPrivateFieldGet(this, _AesFile_overwrite, "f"))
            throw new IntegrityException("Cannot redefine chunk size");
        if (requestChunkSize < 0)
            throw new IntegrityException("Chunk size needs to be zero for default chunk size or a positive value");
        if (integrity && hashKey == null && __classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let key = __classPrivateFieldGet(this, _AesFile_drive, "f").getKey();
            if (key)
                hashKey = key.getHashKey();
        }
        if (integrity && hashKey == null)
            throw new SecurityException("Integrity needs a hashKey");
        __classPrivateFieldSet(this, _AesFile_integrity, integrity, "f");
        __classPrivateFieldSet(this, _AesFile_reqChunkSize, requestChunkSize, "f");
        if (integrity && __classPrivateFieldGet(this, _AesFile_reqChunkSize, "f") == null && __classPrivateFieldGet(this, _AesFile_drive, "f"))
            __classPrivateFieldSet(this, _AesFile_reqChunkSize, __classPrivateFieldGet(this, _AesFile_drive, "f").getDefaultFileChunkSize(), "f");
        __classPrivateFieldSet(this, _AesFile_hashKey, hashKey, "f");
    }
    /**
     * Warning! Allow overwriting on a current stream. Overwriting is not a good idea because it will re-use the same IV.
     * This is not recommended if you use the stream on storing files or generally data if prior version can be inspected by others.
     * You should only use this setting for initial encryption with parallel streams and not for overwriting!
     *
     * @param {boolean} value True to allow overwriting operations
     */
    setAllowOverwrite(value) {
        __classPrivateFieldSet(this, _AesFile_overwrite, value, "f");
    }
    /**
     * Returns the initial vector that is used for encryption / decryption
     * @returns {Promise<Uint8Array | null>} The nonce
     */
    async getFileNonce() {
        let header = await this.getHeader();
        if (header == null)
            return null;
        return header.getNonce();
    }
    /**
     * Set the nonce for encryption/decryption for this file.
     *
     * @param {Uint8Array} nonce Nonce to be used.
     * @throws SalmonSecurityException Thrown when error with security
     */
    setRequestedNonce(nonce) {
        if (__classPrivateFieldGet(this, _AesFile_drive, "f"))
            throw new SecurityException("Nonce is already set by the drive");
        __classPrivateFieldSet(this, _AesFile_requestedNonce, nonce, "f");
    }
    /**
     * Get the nonce that is used for encryption/decryption of this file.
     *
     * @returns {Uint8Array | null} The nonce
     */
    getRequestedNonce() {
        return __classPrivateFieldGet(this, _AesFile_requestedNonce, "f");
    }
    /**
     * Return the AES block size for encryption / decryption
     * @returns {number} The block size
     */
    getBlockSize() {
        return Generator.BLOCK_SIZE;
    }
    /**
     * Get the count of files and subdirectories
     *
     * @returns {Promise<number>} The children count
     */
    async getChildrenCount() {
        return await __classPrivateFieldGet(this, _AesFile_realFile, "f").getChildrenCount();
    }
    /**
     * Lists files and directories under this directory
     * @returns {Promise<AesFile[]>} The files
     */
    async listFiles() {
        let files = await __classPrivateFieldGet(this, _AesFile_realFile, "f").listFiles();
        let aesFiles = [];
        for (let iRealFile of await files) {
            let file = new _a(iRealFile, __classPrivateFieldGet(this, _AesFile_drive, "f"));
            aesFiles.push(file);
        }
        return aesFiles;
    }
    /**
     * Get a child with this filename.
     *
     * @param {string} filename The filename to search for
     * @returns {Promise<AesFile | null>} The file or directory.
     * @throws SalmonSecurityException Thrown when error with security
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     * @throws IOException Thrown if there is an IO error.
     * @throws SalmonAuthException Thrown when error during authorization
     */
    async getChild(filename) {
        let files = await this.listFiles();
        for (let i = 0; i < files.length; i++) {
            if ((await files[i].getName()) == filename)
                return files[i];
        }
        return null;
    }
    /**
     * Creates a directory under this directory
     *
     * @param {string} dirName      The name of the directory to be created
     * @param {Uint8Array | null} key          The key that will be used to encrypt the directory name
     * @param {Uint8Array | null} dirNameNonce The nonce to be used for encrypting the directory name
     * @returns {Promise<AesFile>} The file
     */
    async createDirectory(dirName, key = null, dirNameNonce = null) {
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null)
            throw new SecurityException("Need to pass the key and dirNameNonce nonce if not using a drive");
        let encryptedDirName = await this.getEncryptedFilename(dirName, key, dirNameNonce);
        let realDir = await __classPrivateFieldGet(this, _AesFile_realFile, "f").createDirectory(encryptedDirName);
        return new _a(realDir, __classPrivateFieldGet(this, _AesFile_drive, "f"));
    }
    /**
     * Return the real file
     * @returns {IFile} The file
     */
    getRealFile() {
        return __classPrivateFieldGet(this, _AesFile_realFile, "f");
    }
    /**
     * Returns true if this is a file
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return await __classPrivateFieldGet(this, _AesFile_realFile, "f").isFile();
    }
    /**
     * Returns True if this is a directory
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        return await __classPrivateFieldGet(this, _AesFile_realFile, "f").isDirectory();
    }
    /**
     * Return the path of the real file stored
     * @returns {Promise<string>} The path
     */
    async getPath() {
        let realPath = __classPrivateFieldGet(this, _AesFile_realFile, "f").getDisplayPath();
        return __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getPath).call(this, realPath);
    }
    /**
     * Return the path of the real file
     * @returns {Promise<string>} The real path
     */
    getRealPath() {
        return __classPrivateFieldGet(this, _AesFile_realFile, "f").getDisplayPath();
    }
    /**
     * Returns the name for the file
     * @returns {Promise<string>} The file name
     */
    async getName() {
        if (__classPrivateFieldGet(this, _AesFile__baseName, "f"))
            return __classPrivateFieldGet(this, _AesFile__baseName, "f");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let virtualRoot = await __classPrivateFieldGet(this, _AesFile_drive, "f").getRoot();
            if (virtualRoot == null) {
                throw new SecurityException("Could not get virtual root, you need to init drive first");
            }
            if (this.getRealPath() == virtualRoot.getRealPath())
                return "";
        }
        let realBaseName = __classPrivateFieldGet(this, _AesFile_realFile, "f").getName();
        __classPrivateFieldSet(this, _AesFile__baseName, await this.getDecryptedFilename(realBaseName), "f");
        return __classPrivateFieldGet(this, _AesFile__baseName, "f");
    }
    /**
     * Get the virtual parent directory
     * @returns {Promise<AesFile | null>} The file
     */
    async getParent() {
        try {
            if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null)
                return null;
            let virtualRoot = await __classPrivateFieldGet(this, _AesFile_drive, "f").getRoot();
            if (virtualRoot == null)
                throw new SecurityException("Could not get virtual root, you need to init drive first");
            if (virtualRoot.getRealFile().getPath() == this.getRealFile().getPath()) {
                return null;
            }
        }
        catch (exception) {
            console.error(exception);
            return null;
        }
        let realDir = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getParent();
        if (realDir == null)
            throw new Error("Could not get parent");
        let dir = new _a(realDir, __classPrivateFieldGet(this, _AesFile_drive, "f"));
        return dir;
    }
    /**
     * Delete this file.
     */
    async delete() {
        await __classPrivateFieldGet(this, _AesFile_realFile, "f").delete();
    }
    /**
     * Create this directory. Currently Not Supported
     */
    async mkdir() {
        throw new Error("Unsupported Operation");
    }
    /**
     * Returns the last date modified in milliseconds
     * @returns {Promise<number>} The date modified
     */
    async getLastDateModified() {
        return await __classPrivateFieldGet(this, _AesFile_realFile, "f").getLastDateModified();
    }
    /**
     * Return the virtual size of the file excluding the header and hash signatures.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        let rSize = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getLength();
        if (rSize == 0)
            return rSize;
        let headerBytes = __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getHeaderLength).call(this);
        let totalHashBytes = await __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getHashTotalBytesLength).call(this);
        return rSize - headerBytes - totalHashBytes;
    }
    /**
     * Create a file under this directory
     *
     * @param {string} realFilename  The real file name of the file (encrypted)
     * @param {Uint8Array | null} key           The key that will be used for encryption
     * @param {Uint8Array | null} fileNameNonce The nonce for the encrypting the filename
     * @param {Uint8Array | null} fileNonce     The nonce for the encrypting the file contents
     * @returns {Promise<AesFile>} The new file
     */
    //TODO: files with real same name can exists we can add checking all files in the dir
    // and throw an Exception though this could be an expensive operation
    async createFile(realFilename, key = null, fileNameNonce = null, fileNonce = null) {
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null && (key == null || fileNameNonce == null || fileNonce == null))
            throw new SecurityException("Need to pass the key, filename nonce, and file nonce if not using a drive");
        let encryptedFilename = await this.getEncryptedFilename(realFilename, key, fileNameNonce);
        let file = await __classPrivateFieldGet(this, _AesFile_realFile, "f").createFile(encryptedFilename);
        let aesFile = new _a(file, __classPrivateFieldGet(this, _AesFile_drive, "f"));
        aesFile.setEncryptionKey(key);
        __classPrivateFieldSet(aesFile, _AesFile_integrity, __classPrivateFieldGet(this, _AesFile_integrity, "f"), "f");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && (fileNonce != null || fileNameNonce))
            throw new SecurityException("Nonce is already set by the drive");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && key)
            throw new SecurityException("Key is already set by the drive");
        __classPrivateFieldSet(aesFile, _AesFile_requestedNonce, fileNonce, "f");
        return aesFile;
    }
    /**
     * Rename the virtual file name
     *
     * @param {string} newFilename The new filename this file will be renamed to
     * @param {Uint8Array | null} nonce       The nonce to use
     */
    async rename(newFilename, nonce = null) {
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null && (__classPrivateFieldGet(this, _AesFile_encryptionKey, "f") == null || __classPrivateFieldGet(this, _AesFile_requestedNonce, "f") == null))
            throw new SecurityException("Need to pass a nonce if not using a drive");
        let newEncryptedFilename = await this.getEncryptedFilename(newFilename, null, nonce);
        await __classPrivateFieldGet(this, _AesFile_realFile, "f").renameTo(newEncryptedFilename);
        __classPrivateFieldSet(this, _AesFile__baseName, null, "f");
    }
    /**
     * Returns true if this file exists
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        if (__classPrivateFieldGet(this, _AesFile_realFile, "f") == null)
            return false;
        return await __classPrivateFieldGet(this, _AesFile_realFile, "f").exists();
    }
    /**
     * Return the decrypted filename of a real filename
     *
     * @param {string} filename The filename of a real file
     * @param {Uint8Array | null} key      The encryption key if the file doesn't belong to a drive
     * @param {Uint8Array | null} nonce    The nonce if the file doesn't belong to a drive
     */
    async getDecryptedFilename(filename, key = null, nonce = null) {
        let rfilename = filename.replace(/-/g, "/");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && nonce)
            throw new SecurityException("Filename nonce is already set by the drive");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && key)
            throw new SecurityException("Key is already set by the drive");
        if (key == null)
            key = __classPrivateFieldGet(this, _AesFile_encryptionKey, "f");
        if (key == null && __classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let salmonKey = __classPrivateFieldGet(this, _AesFile_drive, "f").getKey();
            if (salmonKey == null) {
                throw new SecurityException("Could not get the key, make sure you init the drive first");
            }
            key = salmonKey.getDriveKey();
        }
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        let decfilename = await TextDecryptor.decryptString(rfilename, key, nonce);
        return decfilename;
    }
    /**
     * Return the encrypted filename of a virtual filename
     *
     * @param {string} filename The virtual filename
     * @param {Uint8Array | null} key      The encryption key if the file doesn't belong to a drive
     * @param {Uint8Array | null} nonce    The nonce if the file doesn't belong to a drive
     * @returns {Promise<string>} The encrypted filename
     */
    async getEncryptedFilename(filename, key = null, nonce = null) {
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && nonce)
            throw new SecurityException("Filename nonce is already set by the drive");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f"))
            nonce = await __classPrivateFieldGet(this, _AesFile_drive, "f").getNextNonce();
        if (__classPrivateFieldGet(this, _AesFile_drive, "f") != null && key)
            throw new SecurityException("Key is already set by the drive");
        if (__classPrivateFieldGet(this, _AesFile_drive, "f")) {
            let salmonKey = __classPrivateFieldGet(this, _AesFile_drive, "f").getKey();
            if (salmonKey == null) {
                throw new SecurityException("Could not get the key, make sure you init the drive first");
            }
            key = salmonKey.getDriveKey();
        }
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        if (nonce == null)
            throw new IOException("No nonce provided nor fould in file");
        let encryptedPath = await TextEncryptor.encryptString(filename, key, nonce);
        encryptedPath = encryptedPath.replace(/\//g, "-");
        return encryptedPath;
    }
    /**
     * Get the drive.
     *
     * @returns {AesDrive | undefined} The drive
     */
    getDrive() {
        return __classPrivateFieldGet(this, _AesFile_drive, "f");
    }
    /**
     * Set the tag for this file.
     *
     * @param {object} tag Any object
     */
    setTag(tag) {
        __classPrivateFieldSet(this, _AesFile_tag, tag, "f");
    }
    /**
     * Get the file tag.
     *
     * @returns {object | null} The file tag.
     */
    getTag() {
        return __classPrivateFieldGet(this, _AesFile_tag, "f");
    }
    /**
     * Move file to another directory.
     *
     * @param {AesFile} dir                Target directory.
     * @param {MoveOptions} [options]                The options
     * @returns {Promise<AesFile>} The encrypted file
     * @throws IOException Thrown if there is an IO error.
     */
    async move(dir, options) {
        let newRealFile = await __classPrivateFieldGet(this, _AesFile_realFile, "f").move(dir.getRealFile(), options);
        return new _a(newRealFile, __classPrivateFieldGet(this, _AesFile_drive, "f"));
    }
    /**
     * Copy a file to another directory.
     *
     * @param {AesFile} dir                Target directory.
     * @param {CopyOptions} [options] The options.
     * @returns {Promise<AesFile>} The encrypted file
     * @throws IOException Thrown if there is an IO error.
     */
    async copy(dir, options) {
        let newRealFile = await __classPrivateFieldGet(this, _AesFile_realFile, "f").copy(dir.getRealFile(), options);
        if (newRealFile == null)
            throw new IOException("Could not copy file");
        return new _a(newRealFile, __classPrivateFieldGet(this, _AesFile_drive, "f"));
    }
    /**
     * Copy a directory recursively
     *
     * @param {AesFile} dest The destination directory
     * @param {VirtualRecursiveCopyOptions} [options] The options
     */
    async copyRecursively(dest, options) {
        if (!options)
            options = new VirtualRecursiveCopyOptions();
        let onFailedRealFile;
        if (options.onFailed) {
            onFailedRealFile = (file, ex) => {
                if (options.onFailed)
                    options.onFailed(new _a(file, this.getDrive()), ex);
            };
        }
        let renameRealFile;
        // use auto rename only when we are using a drive
        let autoRenameFunc = options.autoRename;
        if (autoRenameFunc && this.getDrive())
            renameRealFile = async (file) => {
                return await autoRenameFunc(new _a(file, this.getDrive()));
            };
        let copyOptions = new RecursiveCopyOptions();
        copyOptions.autoRename = renameRealFile;
        copyOptions.autoRenameFolders = options.autoRenameFolders;
        copyOptions.onFailed = onFailedRealFile;
        copyOptions.onProgressChanged = (file, position, length) => {
            if (options.onProgressChanged)
                options.onProgressChanged(new _a(file, __classPrivateFieldGet(this, _AesFile_drive, "f")), position, length);
        };
        await IFileCopyRecursively(__classPrivateFieldGet(this, _AesFile_realFile, "f"), dest.getRealFile(), copyOptions);
    }
    /**
     * Move a directory recursively
     *
     * @param {AesFile} dest The destination directory
     * @param {VirtualRecursiveMoveOptions} [options] The options
     */
    async moveRecursively(dest, options) {
        if (!options)
            options = new VirtualRecursiveMoveOptions();
        let onFailedRealFile;
        if (options.onFailed) {
            onFailedRealFile = (file, ex) => {
                if (options.onFailed)
                    options.onFailed(new _a(file, this.getDrive()), ex);
            };
        }
        let renameRealFile;
        // use auto rename only when we are using a drive
        let autoRenameFunc = options.autoRename;
        if (autoRenameFunc && this.getDrive())
            renameRealFile = async (file) => {
                return await autoRenameFunc(new _a(file, this.getDrive()));
            };
        let moveOptions = new RecursiveMoveOptions();
        moveOptions.autoRename = renameRealFile;
        moveOptions.autoRenameFolders = options.autoRenameFolders;
        moveOptions.onFailed = onFailedRealFile;
        moveOptions.onProgressChanged = (file, position, length) => {
            if (options.onProgressChanged)
                options.onProgressChanged(new _a(file, __classPrivateFieldGet(this, _AesFile_drive, "f")), position, length);
        };
        await IFileMoveRecursively(__classPrivateFieldGet(this, _AesFile_realFile, "f"), dest.getRealFile(), moveOptions);
    }
    /**
     * Delete a directory recursively
     *
     * @param {VirtualRecursiveDeleteOptions} [options] The options
     */
    async deleteRecursively(options) {
        if (!options)
            options = new VirtualRecursiveDeleteOptions();
        let onFailedRealFile;
        if (options.onFailed) {
            onFailedRealFile = (file, ex) => {
                if (options.onFailed)
                    options.onFailed(new _a(file, __classPrivateFieldGet(this, _AesFile_drive, "f")), ex);
            };
        }
        let deleteOptions = new RecursiveDeleteOptions();
        deleteOptions.onFailed = onFailedRealFile;
        deleteOptions.onProgressChanged = (file, position, length) => {
            if (options.onProgressChanged)
                options.onProgressChanged(new _a(file, __classPrivateFieldGet(this, _AesFile_drive, "f")), position, length);
        };
        await IFileDeleteRecursively(this.getRealFile(), deleteOptions);
    }
    /**
     * Returns the minimum part size that can be encrypted / decrypted in parallel
     * aligning to the integrity chunk size if available.
     * @returns {Promise<number>} The minimum part size
     */
    async getMinimumPartSize() {
        let currChunkSize = await this.getFileChunkSize();
        if (currChunkSize != 0)
            return currChunkSize;
        let requestedChunkSize = this.getRequestedChunkSize();
        if (requestedChunkSize > 0)
            return requestedChunkSize;
        return this.getBlockSize();
    }
}
_a = AesFile, _AesFile_drive = new WeakMap(), _AesFile_format = new WeakMap(), _AesFile_realFile = new WeakMap(), _AesFile__baseName = new WeakMap(), _AesFile__header = new WeakMap(), _AesFile_overwrite = new WeakMap(), _AesFile_integrity = new WeakMap(), _AesFile_reqChunkSize = new WeakMap(), _AesFile_encryptionKey = new WeakMap(), _AesFile_hashKey = new WeakMap(), _AesFile_requestedNonce = new WeakMap(), _AesFile_tag = new WeakMap(), _AesFile_instances = new WeakSet(), _AesFile_getRealFileHeaderData = 
/**
 * Return the current header data that are stored in the file
 *
 * @param {IFile} realFile The real file containing the data
 * @returns {Promise<Uint8Array>} The header data.
 */
async function _AesFile_getRealFileHeaderData(realFile) {
    let realStream = await realFile.getInputStream();
    let headerData = new Uint8Array(__classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getHeaderLength).call(this));
    await realStream.read(headerData, 0, headerData.length);
    await realStream.close();
    return headerData;
}, _AesFile_getChunkSizeLength = function _AesFile_getChunkSizeLength() {
    return Generator.CHUNK_SIZE_LENGTH;
}, _AesFile_getHeaderLength = function _AesFile_getHeaderLength() {
    return Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH +
        __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getChunkSizeLength).call(this) + Generator.NONCE_LENGTH;
}, _AesFile_getPath = 
/**
 * Returns the virtual path for the drive and the file provided
 *
 * @param realPath The path of the real file
 * @returns {Promise<string>} The path
 */
async function _AesFile_getPath(realPath = null) {
    if (realPath == null)
        realPath = __classPrivateFieldGet(this, _AesFile_realFile, "f").getDisplayPath();
    let relativePath = await __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getRelativePath).call(this, realPath);
    let path = "";
    let parts = relativePath.split(/\\|\//);
    for (let part of parts) {
        if (part != "") {
            path += _a.separator;
            path += await this.getDecryptedFilename(part);
        }
    }
    return path.toString();
}, _AesFile_getRelativePath = 
/**
 * Return the virtual relative path of the file belonging to a drive
 *
 * @param realPath The path of the real file
 * @returns {Promise<string>} The relative path
 */
async function _AesFile_getRelativePath(realPath) {
    if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null) {
        return this.getRealFile().getName();
    }
    if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null)
        throw new Error("File is not part of a drive");
    let virtualRoot = await __classPrivateFieldGet(this, _AesFile_drive, "f").getRoot();
    if (virtualRoot == null)
        throw new Error("Could not find virtual root, if this file is part of a drive make sure you init first");
    let virtualRootPath = virtualRoot.getRealFile().getDisplayPath();
    if (realPath.startsWith(virtualRootPath)) {
        return realPath.replace(virtualRootPath, "");
    }
    return realPath;
}, _AesFile_getHashTotalBytesLength = 
/**
 * Returns the hash total bytes occupied by signatures
 * @returns {Promise<number>} The total hash bytes
 */
async function _AesFile_getHashTotalBytesLength() {
    // file does not support integrity
    let fileChunkSize = await this.getFileChunkSize();
    if (fileChunkSize <= 0)
        return 0;
    // integrity has been requested but hash is missing
    if (__classPrivateFieldGet(this, _AesFile_integrity, "f") && this.getHashKey() == null)
        throw new IntegrityException("File requires hashKey, use SetVerifyIntegrity() to provide one");
    let realLength = await __classPrivateFieldGet(this, _AesFile_realFile, "f").getLength();
    let headerLength = __classPrivateFieldGet(this, _AesFile_instances, "m", _AesFile_getHeaderLength).call(this);
    return Integrity.getTotalHashDataLength(EncryptionMode.Decrypt, realLength - headerLength, fileChunkSize, Generator.HASH_RESULT_LENGTH, Generator.HASH_KEY_LENGTH);
}, _AesFile_getDecryptedFilename = 
/**
 * Return the decrypted filename of a real filename
 *
 * @param {string} filename The filename of a real file
 * @returns {Promise<string>} The decrypted filename
 */
async function _AesFile_getDecryptedFilename(filename) {
    if (__classPrivateFieldGet(this, _AesFile_drive, "f") == null && (__classPrivateFieldGet(this, _AesFile_encryptionKey, "f") == null || __classPrivateFieldGet(this, _AesFile_requestedNonce, "f") == null))
        throw new SecurityException("Need to use a drive or pass key and nonce");
    return await this.getDecryptedFilename(filename);
};
AesFile.separator = "/";
/**
 * Default autorename.
 * @param {AesFile} file The file to be renamed
 * @returns {Promise<string>} The new file name
 */
export async function autoRename(file) {
    try {
        return await autoRenameFile(file);
    }
    catch (ex) {
        try {
            return await file.getName();
        }
        catch (ex1) {
            return "";
        }
    }
}
/**
 * Default autorename.
 * @param {AesFile} file The file to be renamed
 * @returns {Promise<string>} The new file name
 */
export async function autoRenameFile(file) {
    let filename = IFileAutoRename(await file.getName());
    let drive = file.getDrive();
    if (!drive)
        throw new IOException("Autorename is not supported without a drive");
    let nonce = await drive.getNextNonce();
    if (nonce == null)
        throw new IOException("Could not get nonce");
    let salmonKey = drive.getKey();
    if (salmonKey == null)
        throw new IOException("Could not get key, make sure you init the drive first");
    let key = salmonKey.getDriveKey();
    if (key == null)
        throw new IOException("Set an encryption key to the file first");
    let encryptedPath = await TextEncryptor.encryptString(filename, key, nonce);
    encryptedPath = encryptedPath.replace(/\//g, "-");
    return encryptedPath;
}
