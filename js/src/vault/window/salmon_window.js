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

import { WindowUtils } from "../utils/window_utils.js";

export class SalmonWindow {
    static modalUrl = "modal.html";

    #icon;
    #modal;
    #closeButton;
    #title;
    #content;

    setupIcon() {
        let icon = WindowUtils.getDefaultIcon();
        this.#icon.src = icon;
    }

    constructor(content) {
        this.setupControls();
        this.setupIcon();
        this.setupEventListeners();
        this.setContent(content);
    }

    static openModal(title, msg) {
        setTimeout(() => {
            fetch(SalmonWindow.modalUrl).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonWindow(msg);
                dialog.setTitle(title);
                dialog.show();
            });
        });
    }

    setupControls() {
        this.#modal = document.getElementById("modal");
        this.#icon = document.getElementById("modal-icon");
        this.#title = document.getElementById("modal-title");
        this.#closeButton = document.getElementsByClassName("modal-close")[0];
        this.#content = document.getElementById("modal-window-content");
    }

    setupEventListeners() {
        let dialog = this;
        this.#closeButton.onclick = function () {
            dialog.#hide();
        }
    }

    setContent(content) {
        this.#content.innerHTML = content;
    }

    setTitle(title) {
        this.#title.innerText = title;
    }

    show() {
        this.#modal.style.display = "block";
    }

    #hide() {
        this.#modal.style.display = "none";
        this.#modal.parentElement.parentElement.removeChild(this.#modal.parentElement);
    }
}
