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
var _Encryptor_instances, _Encryptor_workerPath, _Encryptor_threads, _Encryptor_bufferSize, _Encryptor_promises, _Encryptor_workers, _Encryptor_encryptDataParallel, _Encryptor_submitEncryptJobs;
import { Integrity } from "./integrity/integrity.js";
import { AesStream } from "./streams/aes_stream.js";
import { EncryptionMode } from "./streams/encryption_mode.js";
import { SecurityException } from "./security_exception.js";
import { AESCTRTransformer } from "./transform/aes_ctr_transformer.js";
import { encryptData } from "./encryptor_helper.js";
import { EncryptionFormat } from "./streams/encryption_format.js";
/**
 * Encrypts byte arrays.
 * Make sure you use setWorkerPath() with the correct worker script.
 */
export class Encryptor {
    /**
     * Instantiate an encryptor with parallel tasks and buffer size.
     *
     * @param {number} threads The number of threads to use.
     * @param {number} bufferSize The buffer size to use. It is recommended for performance  to use
     *                   a multiple of the chunk size if you enabled integrity
     *                   otherwise a multiple of the AES block size (16 bytes).
     */
    constructor(threads = 1, bufferSize = 0) {
        _Encryptor_instances.add(this);
        _Encryptor_workerPath.set(this, './lib/salmon-core/salmon/encryptor_worker.js');
        /**
         * The number of parallel threads to use.
         */
        _Encryptor_threads.set(this, void 0);
        /**
         * The buffer size to use.
         */
        _Encryptor_bufferSize.set(this, void 0);
        _Encryptor_promises.set(this, []);
        _Encryptor_workers.set(this, []);
        if (threads <= 0) {
            __classPrivateFieldSet(this, _Encryptor_threads, 1, "f");
        }
        else {
            __classPrivateFieldSet(this, _Encryptor_threads, threads, "f");
        }
        if (bufferSize <= 0) {
            // we use the chunks size as default this keeps buffers aligned in case
            // integrity is enabled.
            __classPrivateFieldSet(this, _Encryptor_bufferSize, Integrity.DEFAULT_CHUNK_SIZE, "f");
        }
        else {
            __classPrivateFieldSet(this, _Encryptor_bufferSize, bufferSize, "f");
        }
    }
    /**
     * Encrypts a byte array using the provided key and nonce.
     *
     * @param {Uint8Array} data            The byte array to be encrypted.
     * @param {Uint8Array} key             The AES key to be used.
     * @param {Uint8Array} nonce           The nonce to be used.
     * @param {EncryptionFormat} format    The format to use, see {@link EncryptionFormat}
     * @param {boolean} integrity       True if you want to calculate and store hash signatures for each chunkSize.
     * @param {Uint8Array} hashKey         Hash key to be used for all chunks.
     * @param {number} chunkSize       The chunk size.
     * @returns {Promise<Uint8Array>} The byte array with the encrypted data.
     * @throws SalmonSecurityException Thrown when error with security
     * @throws IOException Thrown if there is an IO error.
     * @throws IntegrityException Thrown if the data are corrupt or tampered with.
     */
    async encrypt(data, key, nonce, format = EncryptionFormat.Salmon, integrity = false, hashKey = null, chunkSize = 0) {
        if (key == null)
            throw new SecurityException("Key is missing");
        if (nonce == null)
            throw new SecurityException("Nonce is missing");
        if (integrity)
            chunkSize = chunkSize <= 0 ? Integrity.DEFAULT_CHUNK_SIZE : chunkSize;
        else
            chunkSize = 0;
        let realSize = await AesStream.getOutputSize(EncryptionMode.Encrypt, data.length, format, chunkSize);
        let outData = new Uint8Array(realSize);
        if (__classPrivateFieldGet(this, _Encryptor_threads, "f") == 1) {
            await encryptData(data, 0, data.length, outData, key, nonce, format, integrity, hashKey, chunkSize, __classPrivateFieldGet(this, _Encryptor_bufferSize, "f"));
        }
        else {
            await __classPrivateFieldGet(this, _Encryptor_instances, "m", _Encryptor_encryptDataParallel).call(this, data, outData, key, hashKey, nonce, format, chunkSize, integrity);
        }
        return outData;
    }
    close() {
        for (let i = 0; i < __classPrivateFieldGet(this, _Encryptor_workers, "f").length; i++) {
            __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].terminate();
            __classPrivateFieldGet(this, _Encryptor_workers, "f")[i] = null;
        }
        __classPrivateFieldSet(this, _Encryptor_promises, [], "f");
    }
    /**
     * Set the path where the decryptor worker. This needs to be a relative path starting from
     * the root of your main javascript app.
     * @param {string} path The path to the worker javascript.
     */
    setWorkerPath(path) {
        __classPrivateFieldSet(this, _Encryptor_workerPath, path, "f");
    }
    /**
     * Get the current path for the worker javascript.
     * @returns {string} The path to the worker javascript.
     */
    getWorkerPath() {
        return __classPrivateFieldGet(this, _Encryptor_workerPath, "f");
    }
}
_Encryptor_workerPath = new WeakMap(), _Encryptor_threads = new WeakMap(), _Encryptor_bufferSize = new WeakMap(), _Encryptor_promises = new WeakMap(), _Encryptor_workers = new WeakMap(), _Encryptor_instances = new WeakSet(), _Encryptor_encryptDataParallel = 
/**
 * Encrypt stream using parallel threads.
 *
 * @param {Uint8Array} data       The input data to be encrypted
 * @param {Uint8Array} outData    The output buffer with the encrypted data.
 * @param {Uint8Array} key        The AES key.
 * @param {Uint8Array | null} hashKey    The hash key.
 * @param {Uint8Array} nonce      The nonce to be used for encryption.
 * @param {EncryptionFormat} format      The format to use, see {@link EncryptionFormat}
 * @param {number} chunkSize  The chunk size.
 * @param {boolean} integrity  True to apply integrity.
 */
async function _Encryptor_encryptDataParallel(data, outData, key, hashKey, nonce, format, chunkSize, integrity) {
    let runningThreads = 1;
    let partSize = data.length;
    // if we want to check integrity we align to the chunk size otherwise to the AES Block
    let minPartSize = AESCTRTransformer.BLOCK_SIZE;
    if (integrity && chunkSize > 0)
        minPartSize = chunkSize;
    else if (integrity)
        minPartSize = Integrity.DEFAULT_CHUNK_SIZE;
    if (partSize > minPartSize) {
        partSize = Math.ceil(data.length / __classPrivateFieldGet(this, _Encryptor_threads, "f"));
        if (partSize > minPartSize)
            partSize -= partSize % minPartSize;
        else
            partSize = minPartSize;
        runningThreads = Math.floor(data.length / partSize);
        if (runningThreads > __classPrivateFieldGet(this, _Encryptor_threads, "f"))
            runningThreads = __classPrivateFieldGet(this, _Encryptor_threads, "f");
    }
    await __classPrivateFieldGet(this, _Encryptor_instances, "m", _Encryptor_submitEncryptJobs).call(this, runningThreads, partSize, data, outData, key, hashKey, nonce, format, integrity, chunkSize);
}, _Encryptor_submitEncryptJobs = 
/**
 * Submit encryption parallel jobs.
 *
 * @param {number} runningThreads The number of threads to submit.
 * @param {number} partSize       The data length of each part that belongs to each thread.
 * @param {Uint8Array} data           The buffer of data you want to decrypt. This is a shared byte array across all threads where each
 *                       thread will read each own part.
 * @param {Uint8Array} outData        The buffer of data containing the encrypted data.
 * @param {Uint8Array} key            The AES key.
 * @param {Uint8Array} hashKey        The hash key for integrity.
 * @param {Uint8Array} nonce          The nonce for the data.
 * @param {EncryptionFormat} format      The format to use, see {@link EncryptionFormat}
 * @param {boolean} integrity      True to apply the data integrity.
 * @param {number} chunkSize      The chunk size.
 */
async function _Encryptor_submitEncryptJobs(runningThreads, partSize, data, outData, key, hashKey, nonce, format, integrity, chunkSize) {
    __classPrivateFieldSet(this, _Encryptor_promises, [], "f");
    for (let i = 0; i < runningThreads; i++) {
        __classPrivateFieldGet(this, _Encryptor_promises, "f").push(new Promise(async (resolve, reject) => {
            if (typeof process !== 'object') {
                if (__classPrivateFieldGet(this, _Encryptor_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _Encryptor_workers, "f")[i] = new Worker(__classPrivateFieldGet(this, _Encryptor_workerPath, "f"), { type: 'module' });
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].removeEventListener('error', null);
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].removeEventListener('message', null);
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].addEventListener('message', (event) => {
                    if (event.data instanceof Error)
                        reject(event.data);
                    else
                        resolve(event.data);
                });
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].addEventListener('error', (event) => {
                    reject(event);
                });
            }
            else {
                const { Worker } = await import("worker_threads");
                if (__classPrivateFieldGet(this, _Encryptor_workers, "f")[i] == null)
                    __classPrivateFieldGet(this, _Encryptor_workers, "f")[i] = new Worker(__classPrivateFieldGet(this, _Encryptor_workerPath, "f"));
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].removeAllListeners();
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].on('message', (event) => {
                    if (event.data instanceof Error)
                        reject(event);
                    else
                        resolve(event);
                });
                __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].on('error', (event) => {
                    reject(event);
                });
            }
            let start = partSize * i;
            let length;
            if (i == runningThreads - 1)
                length = data.length - start;
            else
                length = partSize;
            __classPrivateFieldGet(this, _Encryptor_workers, "f")[i].postMessage({
                index: i, data: data, out_size: outData.length, start: start, length: length, key: key, nonce: nonce,
                format: format, integrity: integrity, hashKey: hashKey, chunkSize: chunkSize, bufferSize: __classPrivateFieldGet(this, _Encryptor_bufferSize, "f")
            });
        }));
    }
    await Promise.all(__classPrivateFieldGet(this, _Encryptor_promises, "f")).then((results) => {
        for (let i = 0; i < results.length; i++) {
            let startPos = i == 0 ? 0 : results[i].startPos;
            for (let j = startPos; j < results[i].endPos; j++) {
                outData[j] = results[i].outData[j];
            }
        }
    }).catch((event) => {
        console.error(event);
        if (event instanceof Error) {
            throw event;
        }
        else {
            throw new Error("Could not run Worker, make sure you set the correct workerPath");
        }
    });
};
