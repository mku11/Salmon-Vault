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
var _a, _HttpSyncClient_allowClearTextTraffic;
/**
 * Http client
 */
export class HttpSyncClient {
    /**
     * Check if clear text traffic (HTTP) is allowed, otherwise you need to use secure HTTPS protocols.
     * Clear text traffic should ONLY be used for testing purposes.
     *
     * @return True if allow clear text traffic
     */
    static getAllowClearTextTraffic() {
        return __classPrivateFieldGet(_a, _a, "f", _HttpSyncClient_allowClearTextTraffic);
    }
    /**
     * Set to true to allow clear text traffic (HTTP), otherwise you need to use secure HTTPS protocols.
     * Clear text traffic should ONLY be used for testing purposes.
     * @param allow True to allow clear text traffic.
     */
    static setAllowClearTextTraffic(allow) {
        __classPrivateFieldSet(_a, _a, allow, "f", _HttpSyncClient_allowClearTextTraffic);
    }
    /**
     * Get a response from a url
     * @param urlPath The url
     * @return The response
     * @throws Error if error with IO
     */
    static async getResponse(urlpath, init) {
        let url = new URL(urlpath);
		//FIXME: protocol property includes a trailing semicolon
        if (url.protocol !== "https:" && !__classPrivateFieldGet(_a, _a, "f", _HttpSyncClient_allowClearTextTraffic))
            throw new Error("Clear text traffic should only be used for testing purpores, " +
                "use HttpSyncClient.setAllowClearTextTraffic() to override");
        if (url.hostname == null || url.hostname.length == 0)
            throw new Error("Malformed URL or unknown service, check the path");
        return await fetch(url, init);
    }
}
_a = HttpSyncClient;
// static getResponse(arg0: string, arg1: RequestInit): Response | PromiseLike<Response | null> | null {
//     throw new Error("Method not implemented.");
// }
_HttpSyncClient_allowClearTextTraffic = { value: false };
