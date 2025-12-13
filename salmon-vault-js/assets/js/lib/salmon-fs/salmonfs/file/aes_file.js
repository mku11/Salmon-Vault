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
var _a;
import { BitConverter } from "../../../simple-io/convert/bit_converter.js";
import { IOException } from "../../../simple-io/streams/io_exception.js";
import { SeekOrigin } from "../../../simple-io/streams/random_access_stream.js";
import { Generator } from "../../../salmon-core/salmon/generator.js";
import { Header } from "../../../salmon-core/salmon/header.js";
import { AesStream } from "../../../salmon-core/salmon/streams/aes_stream.js";
import { autoRename as IFileAutoRename, copyRecursively as IFileCopyRecursively, moveRecursively as IFileMoveRecursively, deleteRecursively as IFileDeleteRecursively, RecursiveCopyOptions, RecursiveMoveOptions, RecursiveDeleteOptions } from "../../../simple-fs/fs/file/ifile.js";
import { EncryptionMode } from "../../../salmon-core/salmon/streams/encryption_mode.js";
import { EncryptionFormat } from "../../../salmon-core/salmon/streams/encryption_format.js";
import { SecurityException } from "../../../salmon-core/salmon/security_exception.js";
import { IntegrityException } from "../../../salmon-core/salmon/integrity/integrity_exception.js";
import { TextDecryptor } from "../../../salmon-core/salmon/text/text_decryptor.js";
import { TextEncryptor } from "../../../salmon-core/salmon/text/text_encryptor.js";
import { Integrity } from "../../../salmon-core/salmon/integrity/integrity.js";
import { VirtualRecursiveCopyOptions, VirtualRecursiveMoveOptions, VirtualRecursiveDeleteOptions } from "../../../simple-fs/fs/file/ivirtual_file.js";
/**
 * A virtual file backed by an encrypted {@link IFile} on the real filesystem.
 * Supports operations for retrieving {@link AesStream} for reading/decrypting
 * and writing/encrypting contents.
 */
export class AesFile {
    static separator = "/";
    #drive;
    #format;
    #realFile;
    //cached values
    #_baseName = null;
    #_header = null;
    #overwrite = false;
    #integrity = false;
    #reqChunkSize = 0;
    #encryptionKey = null;
    #hashKey = null;
    #requestedNonce = null;
    #tag = null;
    /**
     * Provides a file handle that can be used to create encrypted files.
     * Requires a virtual drive that supports the underlying filesystem see IFile.
     *
     * @param {IFile} realFile The real file
     * @param {AesDrive} [drive]    The file virtual system that will be used with file operations.
     * You usually don't have to set this since it will inherit from its parent.
     */
    constructor(realFile, drive, format = EncryptionFormat.Salmon) {
        this.#realFile = realFile;
        this.#drive = drive;
        this.#format = format;
        if (this.#integrity && drive)
            this.#reqChunkSize = drive.getDefaultFileChunkSize();
        if (drive != null && drive.getKey()) {
            let key = drive.getKey();
            if (key)
                this.#hashKey = key.getHashKey();
        }
    }
    /**
     * Return if integrity is set
     */
    isIntegrityEnabled() {
        return this.#integrity;
    }
    /**
     * Return the current chunk size requested that will be used for integrity
     */
    getRequestedChunkSize() {
        return this.#reqChunkSize;
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
        if (this.#_header)
            return this.#_header;
        let header = new Header(new Uint8Array());
        let stream = null;
        try {
            stream = await this.#realFile.getInputStream();
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
        this.#_header = header;
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
        let realStream = await this.#realFile.getInputStream();
        await realStream.seek(Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH, SeekOrigin.Begin);
        let fileChunkSizeBytes = new Uint8Array(this.#getChunkSizeLength());
        let bytesRead = await realStream.read(fileChunkSizeBytes, 0, fileChunkSizeBytes.length);
        if (bytesRead == 0)
            throw new IOException("Could not parse chunks size from file header");
        let chunkSize = BitConverter.toLong(fileChunkSizeBytes, 0, 4);
        if (this.#integrity && chunkSize == 0)
            throw new SecurityException("Cannot check integrity if file doesn't support it");
        let nonceBytes = new Uint8Array(Generator.NONCE_LENGTH);
        let ivBytesRead = await realStream.read(nonceBytes, 0, nonceBytes.length);
        if (ivBytesRead == 0)
            throw new IOException("Could not parse nonce from file header");
        await realStream.setPosition(0);
        let headerData = new Uint8Array(this.#getHeaderLength());
        await realStream.read(headerData, 0, headerData.length);
        let key = this.getEncryptionKey();
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        let stream = new AesStream(key, nonceBytes, EncryptionMode.Decrypt, realStream, this.#format, this.#integrity, this.getHashKey());
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
        if (nonceBytes != null && !this.#overwrite)
            throw new SecurityException("You should not overwrite existing files for security instead delete the existing file and create a new file. If this is a new file and you want to use parallel streams you can   this with SetAllowOverwrite(true)");
        if (nonceBytes == null) {
            // set it to zero (disabled integrity) or get the default chunk
            // size defined by the drive
            if (this.#integrity && this.#reqChunkSize == null && this.#drive)
                this.#reqChunkSize = this.#drive.getDefaultFileChunkSize();
            else if (!this.#integrity)
                this.#reqChunkSize = 0;
            if (this.#reqChunkSize == null)
                throw new IntegrityException("File requires a chunk size");
            if (nonce)
                this.#requestedNonce = nonce;
            else if (this.#requestedNonce == null && this.#drive)
                this.#requestedNonce = await this.#drive.getNextNonce();
            if (this.#requestedNonce == null)
                throw new SecurityException("File requires a nonce");
            nonceBytes = this.#requestedNonce;
        }
        // create a stream with the file chunk size specified which will be used to host the integrity hash
        // we also specify if stream ranges can be overwritten which is generally dangerous if the file is existing
        // but practical if the file is brand new and multithreaded writes for performance need to be used.
        let realStream = await this.#realFile.getOutputStream();
        let key = this.getEncryptionKey();
        if (key == null)
            throw new IOException("Set an encryption key to the file first");
        if (nonceBytes == null)
            throw new IOException("No nonce provided and no nonce found in file");
        let stream = new AesStream(key, nonceBytes, EncryptionMode.Encrypt, realStream, this.#format, this.#integrity, this.getHashKey(), this.getRequestedChunkSize());
        stream.setAllowRangeWrite(this.#overwrite);
        return stream;
    }
    /**
     * Returns the current encryption key
     * @returns {Uint8Array | null} The key
     */
    getEncryptionKey() {
        if (this.#encryptionKey)
            return this.#encryptionKey;
        if (this.#drive) {
            let key = this.#drive.getKey();
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
        this.#encryptionKey = encryptionKey;
    }
    /**
     * Return the current header data that are stored in the file
     *
     * @param {IFile} realFile The real file containing the data
     * @returns {Promise<Uint8Array>} The header data.
     */
    async #getRealFileHeaderData(realFile) {
        let realStream = await realFile.getInputStream();
        let headerData = new Uint8Array(this.#getHeaderLength());
        await realStream.read(headerData, 0, headerData.length);
        await realStream.close();
        return headerData;
    }
    /**
     * Retrieve the current hash key that is used to encrypt / decrypt the file contents.
     * @returns {Uint8Array | null} The hash key.
     */
    getHashKey() {
        return this.#hashKey;
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
        if (integrity && hashKey == null && this.#drive) {
            let key = this.#drive.getKey();
            if (key)
                hashKey = key.getHashKey();
        }
        this.#reqChunkSize = await this.getFileChunkSize();
        if (integrity && this.#reqChunkSize == 0) {
            console.log("warning: cannot enable integrity because file does not contain integrity chunks");
            return;
        }
        this.#integrity = integrity;
        this.#hashKey = hashKey;
        if (header)
            this.#reqChunkSize = header.getChunkSize();
    }
    /**
     * Appy integrity when writing to file.
     * @param {boolean} integrity True to apply integrity
     * @param {Uint8Array | null} hashKey The hash key
     * @param {number} requestChunkSize A positive number to specify integrity chunk size.
     */
    async setApplyIntegrity(integrity, hashKey = null, requestChunkSize = 0) {
        let header = await this.getHeader();
        if (header != null && header.getChunkSize() > 0 && !this.#overwrite)
            throw new IntegrityException("Cannot redefine chunk size");
        if (requestChunkSize < 0)
            throw new IntegrityException("Chunk size needs to be zero for default chunk size or a positive value");
        if (integrity && hashKey == null && this.#drive) {
            let key = this.#drive.getKey();
            if (key)
                hashKey = key.getHashKey();
        }
        if (integrity && hashKey == null)
            throw new SecurityException("Integrity needs a hashKey");
        this.#integrity = integrity;
        this.#reqChunkSize = requestChunkSize;
        if (integrity && this.#reqChunkSize == null && this.#drive)
            this.#reqChunkSize = this.#drive.getDefaultFileChunkSize();
        this.#hashKey = hashKey;
    }
    /**
     * Warning! Allow overwriting on a current stream. Overwriting is not a good idea because it will re-use the same IV.
     * This is not recommended if you use the stream on storing files or generally data if prior version can be inspected by others.
     * You should only use this setting for initial encryption with parallel streams and not for overwriting!
     *
     * @param {boolean} value True to allow overwriting operations
     */
    setAllowOverwrite(value) {
        this.#overwrite = value;
    }
    /**
     * Returns the file chunk size
     * @returns {number} The chunk
     */
    #getChunkSizeLength() {
        return Generator.CHUNK_SIZE_LENGTH;
    }
    /**
     * Returns the length of the header in bytes
     * @returns {number} The header length
     */
    #getHeaderLength() {
        return Generator.MAGIC_LENGTH + Generator.VERSION_LENGTH +
            this.#getChunkSizeLength() + Generator.NONCE_LENGTH;
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
        if (this.#drive)
            throw new SecurityException("Nonce is already set by the drive");
        this.#requestedNonce = nonce;
    }
    /**
     * Get the nonce that is used for encryption/decryption of this file.
     *
     * @returns {Uint8Array | null} The nonce
     */
    getRequestedNonce() {
        return this.#requestedNonce;
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
        return await this.#realFile.getChildrenCount();
    }
    /**
     * Lists files and directories under this directory
     * @returns {Promise<AesFile[]>} The files
     */
    async listFiles() {
        let files = await this.#realFile.listFiles();
        let aesFiles = [];
        for (let iRealFile of await files) {
            let file = new _a(iRealFile, this.#drive);
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
        if (this.#drive == null)
            throw new SecurityException("Need to pass the key and dirNameNonce nonce if not using a drive");
        let encryptedDirName = await this.getEncryptedFilename(dirName, key, dirNameNonce);
        let realDir = await this.#realFile.createDirectory(encryptedDirName);
        return new _a(realDir, this.#drive);
    }
    /**
     * Return the real file
     * @returns {IFile} The file
     */
    getRealFile() {
        return this.#realFile;
    }
    /**
     * Returns true if this is a file
     * @returns {Promise<boolean>} True if file
     */
    async isFile() {
        return await this.#realFile.isFile();
    }
    /**
     * Returns True if this is a directory
     * @returns {Promise<boolean>} True if directory
     */
    async isDirectory() {
        return await this.#realFile.isDirectory();
    }
    /**
     * Return the path of the real file stored
     * @returns {Promise<string>} The path
     */
    async getPath() {
        let realPath = this.#realFile.getDisplayPath();
        return await this.#getPath(realPath);
    }
    /**
     * Returns the virtual path for the drive and the file provided
     *
     * @param realPath The path of the real file
     * @returns {Promise<string>} The path
     */
    async #getPath(realPath = null) {
        if (realPath == null)
            realPath = this.#realFile.getDisplayPath();
        let relativePath = await this.#getRelativePath(realPath);
        let path = "";
        let parts = relativePath.split(/\\|\//);
        for (let part of parts) {
            if (part != "") {
                path += _a.separator;
                path += await this.getDecryptedFilename(part);
            }
        }
        return path.toString();
    }
    /**
     * Return the path of the real file
     * @returns {Promise<string>} The real path
     */
    getRealPath() {
        return this.#realFile.getDisplayPath();
    }
    /**
     * Return the virtual relative path of the file belonging to a drive
     *
     * @param realPath The path of the real file
     * @returns {Promise<string>} The relative path
     */
    async #getRelativePath(realPath) {
        if (this.#drive == null) {
            return this.getRealFile().getName();
        }
        if (this.#drive == null)
            throw new Error("File is not part of a drive");
        let virtualRoot = await this.#drive.getRoot();
        if (virtualRoot == null)
            throw new Error("Could not find virtual root, if this file is part of a drive make sure you init first");
        let virtualRootPath = virtualRoot.getRealFile().getDisplayPath();
        if (realPath.startsWith(virtualRootPath)) {
            return realPath.replace(virtualRootPath, "");
        }
        return realPath;
    }
    /**
     * Returns the name for the file
     * @returns {Promise<string>} The file name
     */
    async getName() {
        if (this.#_baseName)
            return this.#_baseName;
        if (this.#drive) {
            let virtualRoot = await this.#drive.getRoot();
            if (virtualRoot == null) {
                throw new SecurityException("Could not get virtual root, you need to init drive first");
            }
            if (this.getRealPath() == virtualRoot.getRealPath())
                return "";
        }
        let realBaseName = this.#realFile.getName();
        this.#_baseName = await this.getDecryptedFilename(realBaseName);
        return this.#_baseName;
    }
    /**
     * Get the virtual parent directory
     * @returns {Promise<AesFile | null>} The file
     */
    async getParent() {
        try {
            if (this.#drive == null)
                return null;
            let virtualRoot = await this.#drive.getRoot();
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
        let realDir = await this.#realFile.getParent();
        if (realDir == null)
            throw new Error("Could not get parent");
        let dir = new _a(realDir, this.#drive);
        return dir;
    }
    /**
     * Delete this file.
     */
    async delete() {
        await this.#realFile.delete();
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
        return await this.#realFile.getLastDateModified();
    }
    /**
     * Return the virtual size of the file excluding the header and hash signatures.
     * @returns {Promise<number>} The length
     */
    async getLength() {
        let rSize = await this.#realFile.getLength();
        if (rSize == 0)
            return rSize;
        let headerBytes = this.#getHeaderLength();
        let totalHashBytes = await this.#getHashTotalBytesLength();
        return rSize - headerBytes - totalHashBytes;
    }
    /**
     * Returns the hash total bytes occupied by signatures
     * @returns {Promise<number>} The total hash bytes
     */
    async #getHashTotalBytesLength() {
        // file does not support integrity
        let fileChunkSize = await this.getFileChunkSize();
        if (fileChunkSize <= 0)
            return 0;
        // integrity has been requested but hash is missing
        if (this.#integrity && this.getHashKey() == null)
            throw new IntegrityException("File requires hashKey, use SetVerifyIntegrity() to provide one");
        let realLength = await this.#realFile.getLength();
        let headerLength = this.#getHeaderLength();
        return Integrity.getTotalHashDataLength(EncryptionMode.Decrypt, realLength - headerLength, fileChunkSize, Generator.HASH_RESULT_LENGTH, Generator.HASH_KEY_LENGTH);
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
        if (this.#drive == null && (key == null || fileNameNonce == null || fileNonce == null))
            throw new SecurityException("Need to pass the key, filename nonce, and file nonce if not using a drive");
        let encryptedFilename = await this.getEncryptedFilename(realFilename, key, fileNameNonce);
        let file = await this.#realFile.createFile(encryptedFilename);
        let aesFile = new _a(file, this.#drive);
        aesFile.setEncryptionKey(key);
        aesFile.#integrity = this.#integrity;
        if (this.#drive != null && (fileNonce != null || fileNameNonce))
            throw new SecurityException("Nonce is already set by the drive");
        if (this.#drive != null && key)
            throw new SecurityException("Key is already set by the drive");
        aesFile.#requestedNonce = fileNonce;
        return aesFile;
    }
    /**
     * Rename the virtual file name
     *
     * @param {string} newFilename The new filename this file will be renamed to
     * @param {Uint8Array | null} nonce       The nonce to use
     */
    async rename(newFilename, nonce = null) {
        if (this.#drive == null && (this.#encryptionKey == null || this.#requestedNonce == null))
            throw new SecurityException("Need to pass a nonce if not using a drive");
        let newEncryptedFilename = await this.getEncryptedFilename(newFilename, null, nonce);
        await this.#realFile.renameTo(newEncryptedFilename);
        this.#_baseName = null;
    }
    /**
     * Returns true if this file exists
     * @returns {Promise<boolean>} True if exists
     */
    async exists() {
        if (this.#realFile == null)
            return false;
        return await this.#realFile.exists();
    }
    /**
     * Return the decrypted filename of a real filename
     *
     * @param {string} filename The filename of a real file
     * @returns {Promise<string>} The decrypted filename
     */
    async #getDecryptedFilename(filename) {
        if (this.#drive == null && (this.#encryptionKey == null || this.#requestedNonce == null))
            throw new SecurityException("Need to use a drive or pass key and nonce");
        return await this.getDecryptedFilename(filename);
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
        if (this.#drive != null && nonce)
            throw new SecurityException("Filename nonce is already set by the drive");
        if (this.#drive != null && key)
            throw new SecurityException("Key is already set by the drive");
        if (key == null)
            key = this.#encryptionKey;
        if (key == null && this.#drive) {
            let salmonKey = this.#drive.getKey();
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
        if (this.#drive != null && nonce)
            throw new SecurityException("Filename nonce is already set by the drive");
        if (this.#drive)
            nonce = await this.#drive.getNextNonce();
        if (this.#drive != null && key)
            throw new SecurityException("Key is already set by the drive");
        if (this.#drive) {
            let salmonKey = this.#drive.getKey();
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
        return this.#drive;
    }
    /**
     * Set the tag for this file.
     *
     * @param {object} tag Any object
     */
    setTag(tag) {
        this.#tag = tag;
    }
    /**
     * Get the file tag.
     *
     * @returns {object | null} The file tag.
     */
    getTag() {
        return this.#tag;
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
        let newRealFile = await this.#realFile.move(dir.getRealFile(), options);
        return new _a(newRealFile, this.#drive);
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
        let newRealFile = await this.#realFile.copy(dir.getRealFile(), options);
        if (newRealFile == null)
            throw new IOException("Could not copy file");
        return new _a(newRealFile, this.#drive);
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
                options.onProgressChanged(new _a(file, this.#drive), position, length);
        };
        await IFileCopyRecursively(this.#realFile, dest.getRealFile(), copyOptions);
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
                options.onProgressChanged(new _a(file, this.#drive), position, length);
        };
        await IFileMoveRecursively(this.#realFile, dest.getRealFile(), moveOptions);
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
                    options.onFailed(new _a(file, this.#drive), ex);
            };
        }
        let deleteOptions = new RecursiveDeleteOptions();
        deleteOptions.onFailed = onFailedRealFile;
        deleteOptions.onProgressChanged = (file, position, length) => {
            if (options.onProgressChanged)
                options.onProgressChanged(new _a(file, this.#drive), position, length);
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
_a = AesFile;
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
