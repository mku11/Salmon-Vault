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
var _a, _AesNativeTransformer_nativeProxy, _AesNativeTransformer_implType;
import { SecurityException } from "../security_exception.js";
import { NativeProxy } from "../bridge/native_proxy.js";
import { AESCTRTransformer } from "./aes_ctr_transformer.js";
/**
 * Generic Native AES transformer. Extend this with your specific
 * native transformer.
 */
export class AesNativeTransformer extends AESCTRTransformer {
    /**
     * The native proxy to use for loading libraries for different platforms and operating systems.
     * @param {INativeProxy} proxy The proxy.
     */
    static setNativeProxy(proxy) {
        __classPrivateFieldSet(_a, _a, proxy, "f", _AesNativeTransformer_nativeProxy);
    }
    /**
     * The current proxy used for loading native library.
     * @returns {INativeProxy} The proxy.
     */
    static getNativeProxy() {
        return __classPrivateFieldGet(_a, _a, "f", _AesNativeTransformer_nativeProxy);
    }
    /**
     *
     * @returns {number} The native implementation type see ProviderType enum
     */
    getImplType() {
        return __classPrivateFieldGet(this, _AesNativeTransformer_implType, "f");
    }
    /**
     *
     * @param {number} implType The native implementation type see ProviderType enum
     */
    setImplType(implType) {
        __classPrivateFieldSet(this, _AesNativeTransformer_implType, implType, "f");
    }
    /**
     * Construct a SalmonNativeTransformer for using the native aes c library
     * @param {number} implType The AES native implementation see ProviderType enum
     */
    constructor(implType) {
        super();
        _AesNativeTransformer_implType.set(this, void 0);
        __classPrivateFieldSet(this, _AesNativeTransformer_implType, implType, "f");
    }
    /**
     * Initialize the native Aes intrinsics transformer.
     * @param {Uint8Array} key The AES key to use.
     * @param {Uint8Array} nonce The nonce to use.
     * @throws SalmonSecurityException Thrown when error with security
     */
    async init(key, nonce) {
        _a.getNativeProxy().init(__classPrivateFieldGet(this, _AesNativeTransformer_implType, "f"));
        let expandedKey = new Uint8Array(AESCTRTransformer.EXPANDED_KEY_SIZE);
        _a.getNativeProxy().expandKey(key, expandedKey);
        this.setExpandedKey(expandedKey);
        await super.init(key, nonce);
    }
    /**
     * Encrypt the data.
     * @param {Uint8Array} srcBuffer The source byte array.
     * @param {number} srcOffset The source byte offset.
     * @param {Uint8Array} destBuffer The destination byte array.
     * @param {number} destOffset The destination byte offset.
     * @param {number} count The number of bytes to transform.
     * @returns {Promise<number>} The number of bytes transformed.
     */
    async encryptData(srcBuffer, srcOffset, destBuffer, destOffset, count) {
        let key = this.getExpandedKey();
        let ctr = this.getCounter();
        if (key == null)
            throw new SecurityException("No key found, run init first");
        if (ctr == null)
            throw new SecurityException("No counter found, run init first");
        return __classPrivateFieldGet(_a, _a, "f", _AesNativeTransformer_nativeProxy).transform(key, ctr, srcBuffer, srcOffset, destBuffer, destOffset, count);
    }
    /**
     * Decrypt the data.
     * @param {Uint8Array} srcBuffer The source byte array.
     * @param {number} srcOffset The source byte offset.
     * @param {Uint8Array} destBuffer The destination byte array.
     * @param {number} destOffset The destination byte offset.
     * @param {number} count The number of bytes to transform.
     * @returns {Promise<number>} The number of bytes transformed.
     */
    async decryptData(srcBuffer, srcOffset, destBuffer, destOffset, count) {
        let key = this.getExpandedKey();
        let ctr = this.getCounter();
        if (key == null)
            throw new SecurityException("No key found, run init first");
        if (ctr == null)
            throw new SecurityException("No counter found, run init first");
        return __classPrivateFieldGet(_a, _a, "f", _AesNativeTransformer_nativeProxy).transform(key, ctr, srcBuffer, srcOffset, destBuffer, destOffset, count);
    }
}
_a = AesNativeTransformer, _AesNativeTransformer_implType = new WeakMap();
_AesNativeTransformer_nativeProxy = { value: new NativeProxy() };
