var _a;
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
import { ReadableStreamWrapper } from "../../../simple-io/streams/readable_stream_wrapper.js";
import { HttpSyncClient } from "../../../simple-fs/fs/file/http_sync_client.js";
import { AesFile } from "../file/aes_file.js";
import { AesFileReadableStream } from "../streams/aes_file_readable_stream.js";
import { FileUtils } from "../../../simple-fs/fs/drive/utils/file_utils.js";
export class AesServiceWorker {
    static BUFFERS = 4;
    static BUFFER_SIZE = 4 * 1024 * 1024;
    // Web workers are not available inside a service worker see: https://github.com/whatwg/html/issues/411
    static THREADS = 1;
    static BACK_OFFSET = 256 * 1024;
    requests = {};
    getPosition(headers) {
        let position = 0;
        if (headers.has('range')) {
            let range = headers.get('range');
            if (range)
                position = parseInt(range.split("=")[1].split("-")[0]);
        }
        return position;
    }
    async #getResponse(request) {
        let position = this.getPosition(request.headers);
        let params = this.requests[request.url];
        if (params.allowClearTextTraffic)
            HttpSyncClient.setAllowClearTextTraffic(true);
        let file = await FileUtils.getInstance(params.fileClass, params.fileHandle, params.servicePath, params.serviceUser, params.servicePassword);
        let aesFile = new AesFile(file);
        aesFile.setEncryptionKey(params.key);
        await aesFile.setVerifyIntegrity(params.integrity, params.hash_key);
        let stream;
        if (params.useFileReadableStream) {
            stream = AesFileReadableStream.createFileReadableStream(aesFile, _a.BUFFERS, _a.BUFFER_SIZE, _a.THREADS, _a.BACK_OFFSET);
            stream.setWorkerPath(params.workerPath);
            await stream.setPositionStart(position);
            stream.reset();
            await stream.skip(0);
        }
        else {
            let encStream = await aesFile.getInputStream();
            stream = ReadableStreamWrapper.createReadableStream(encStream);
            await stream.reset();
            await stream.skip(position);
        }
        let streamSize = await aesFile.getLength() - position;
        let headers = new Headers();
        let contentLength = await aesFile.getLength();
        headers.append("Content-Length", (streamSize) + "");
        // if position is position or zero we always set the byte range and set the response status to 206
        // to force html elements to stream the contents. 
        let status = position == null ? 200 : 206;
        if (position >= 0)
            headers.append("Content-Range", "bytes " + position + "-" + (position + streamSize - 1) + "/" + contentLength);
        headers.append("Content-Type", params.mimeType);
        return new Response(stream, {
            headers: headers,
            status: status
        });
    }
    registerRequest(path, params) {
        this.requests[path] = params;
    }
    unregisterRequest(path = null) {
        if (path != null)
            delete this.requests[path];
        else
            this.requests = {};
    }
    onMessage(event) {
        if (event.data.message == 'register') {
            this.registerRequest(event.data.path, event.data.params);
        }
        else if (event.data.message == 'unregister') {
            this.unregisterRequest(event.data.path);
        }
    }
    onFetch(event) {
        let url = event.request.url;
        if (url in this.requests) {
            return event.respondWith(new Promise(async (resolve, reject) => {
                let response = await this.#getResponse(event.request);
                resolve(response);
            }));
        }
        return event.response;
    }
}
_a = AesServiceWorker;
