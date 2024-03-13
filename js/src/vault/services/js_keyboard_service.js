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

import { IKeyboardService } from "../../common/services/ikeyboard_service.js";

export class JsKeyboardService extends IKeyboardService {
    onMetaKey;
    onKey;

    constructor() {
        super();
        document.onkeyup = (e) => this.keyDetected(e);
        document.onkeydown = (e) => this.keyDetected(e);
    }

    keyDetected(e) {
        e = e || window.event;
        if (e.key == 'Control' || e.key == 'Alt' || e.key == 'Shift') {
            if (this.onMetaKey != null)
                this.onMetaKey(e);
        } else {
            if (this.onKey != null)
                this.onKey(e);
        }
    }
}