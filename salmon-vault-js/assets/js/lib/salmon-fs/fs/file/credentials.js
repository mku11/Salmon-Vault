/*
MIT License

Copyright (c) 2025 Max Kas

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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Credentials_serviceUser, _Credentials_servicePassword;
/**
 * Credentials
 */
export class Credentials {
    /**
     * Get the user name
     * @returns {string} The user name
     */
    getServiceUser() {
        return __classPrivateFieldGet(this, _Credentials_serviceUser, "f");
    }
    /**
     * Get the password
     * @returns {string} The password
     */
    getServicePassword() {
        return __classPrivateFieldGet(this, _Credentials_servicePassword, "f");
    }
    /**
     * Construct a credentials object.
     * @param {string} serviceUser The user name
     * @param {string} servicePassword The password
     */
    constructor(serviceUser, servicePassword) {
        _Credentials_serviceUser.set(this, void 0);
        _Credentials_servicePassword.set(this, void 0);
        __classPrivateFieldSet(this, _Credentials_serviceUser, serviceUser, "f");
        __classPrivateFieldSet(this, _Credentials_servicePassword, servicePassword, "f");
    }
}
_Credentials_serviceUser = new WeakMap(), _Credentials_servicePassword = new WeakMap();
