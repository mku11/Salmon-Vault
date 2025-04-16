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
import { IOException } from "./io_exception.js";
import { ReadableStreamWrapper } from "./readable_stream_wrapper.js";
/**
 * Base class for read-write seekable streams.
 */
export class RandomAccessStream {
    /**
     * The preferred align size
     * @return The align size
     */
    getAlignSize() {
        return 32768;
    }
    /**
     * Write stream contents to another stream.
     * @param {RandomAccessStream} stream The target stream.
     * @param {number} bufferSize The buffer size to be used when copying.
     * @param {OnProgressChanged} onProgressChanged The listener to notify when progress changes.
     * @throws IOException Thrown if there is an IO error.
     */
    async copyTo(stream, bufferSize = 0, onProgressChanged) {
        if (!(await this.canRead()))
            throw new IOException("Target stream not readable");
        if (!(await stream.canWrite()))
            throw new IOException("Target stream not writable");
        if (bufferSize <= 0) {
            bufferSize = RandomAccessStream.DEFAULT_BUFFER_SIZE;
        }
        bufferSize = Math.floor(bufferSize / this.getAlignSize()) * this.getAlignSize();
        let bytesRead;
        const buffer = new Uint8Array(bufferSize);
        while ((bytesRead = await this.read(buffer, 0, bufferSize)) > 0) {
            await stream.write(buffer, 0, bytesRead);
            if (onProgressChanged)
                onProgressChanged(await this.getPosition(), await this.getLength());
        }
        await stream.flush();
    }
    async asReadStream() {
        return ReadableStreamWrapper.createReadableStream(this);
    }
}
/**
 * Default buffer size
 */
RandomAccessStream.DEFAULT_BUFFER_SIZE = 256 * 1024;
/**
 * Used to identify the start offset for seeking to a stream.
 */
export var SeekOrigin;
(function (SeekOrigin) {
    /**
     * Start from the beginning of the stream.
     */
    SeekOrigin[SeekOrigin["Begin"] = 0] = "Begin";
    /**
     * Start from the current position of the stream.
     */
    SeekOrigin[SeekOrigin["Current"] = 1] = "Current";
    /**
     * Start from the end of the stream.
     */
    SeekOrigin[SeekOrigin["End"] = 2] = "End";
})(SeekOrigin || (SeekOrigin = {}));
