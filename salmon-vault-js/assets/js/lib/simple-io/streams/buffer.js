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
/**
 * Buffer that can be used for buffered streams.
 */
export class Buffer {
    #data;
    #startPos = 0;
    #count = 0;
    /**
     * Get the data
     *
     * @returns {Uint8Array} The data
     */
    getData() {
        return this.#data;
    }
    /**
     * Set the data
     *
     * @param {Uint8Array} data The data
     */
    setData(data) {
        this.#data = data;
    }
    /**
     * Get the start position
     *
     * @returns {number} The start position
     */
    getStartPos() {
        return this.#startPos;
    }
    /**
     * Set the start position
     *
     * @param {number} startPos The start position
     */
    setStartPos(startPos) {
        this.#startPos = startPos;
    }
    /**
     * Get the data count
     *
     * @returns {number} The data count
     */
    getCount() {
        return this.#count;
    }
    setCount(count) {
        this.#count = count;
    }
    /**
     * Instantiate a cache buffer.
     *
     * @param {Uint8Array} bufferSize The buffer size
     */
    constructor(bufferSize) {
        this.#data = new Uint8Array(bufferSize);
    }
    /**
     * Clear the buffer.
     */
    clear() {
        if (this.#data)
            this.#data.fill(0);
    }
}
