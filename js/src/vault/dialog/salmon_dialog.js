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
import { SalmonFileUtils } from "../../lib/salmon-fs/utils/salmon_file_utils.js";

export class SalmonDialog {
    static dialogURL = "dialog.html";
    static defaultStyleSheet;

    static setDefaultStyleSheet(defaultStyleSheet) {
        SalmonDialog.defaultStyleSheet = defaultStyleSheet;
    }

    #icon;
    #modal;
    #closeButton;
    #text;
    #input;
    #title;
    #option;
    #firstButton;
    #secondButton;

    setupIcon() {
        let icon = WindowUtils.getDefaultIcon();
        this.#icon.src = icon;
    }

    constructor(content, buttonListener1, buttonListener2 = null) {
        this.setupControls();
        this.setupIcon();
        this.setupStyle();
        this.setupEventListeners();
        this.setContent(content);
        this.setFirstButton("Ok", buttonListener1);
        if(buttonListener2 != null)
            this.setSecondButton("Cancel", buttonListener2);
    }

    static promptEdit(title, msg, OnEdit, value = "", isFileName = false, readOnly = false, isPassword = false, option = null) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(msg, "Ok");
                dialog.setTitle(title);
                dialog.setValue(value, isFileName, readOnly, isPassword);
                dialog.setOption(option);
                dialog.setFirstButton("ok", () => {
                    if (OnEdit != null)
                        OnEdit(dialog.#input.value);
                });
                dialog.show();
            });
        });
    }

    static promptDialog(title, body,
        buttonLabel1 = "ok", buttonListener1 = null,
        buttonLabel2 = null, buttonListener2 = null) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(body);
                dialog.setTitle(title);
                dialog.setFirstButton(buttonLabel1, buttonListener1);
                dialog.setSecondButton(buttonLabel2, buttonListener2);
                dialog.show();
            });
        });
    }

    setupControls() {
        this.#modal = document.getElementById("modal");
        this.#icon = document.getElementById("modal-icon");
        this.#title = document.getElementById("modal-title");
        this.#text = document.getElementById("modal-text");
        this.#input = document.getElementById("dialog-input");
        this.#option = document.getElementById("dialog-option");
        this.#firstButton = document.getElementById("dialog-button-first");
        this.#secondButton = document.getElementById("dialog-button-second");
    }

    setupEventListeners() {
        let dialog = this;
        this.#closeButton.onclick = function () {
            dialog.#hide();
        }
    }

    setContent(content) {
        this.#text.innerText = content;
    }

    setTitle(title) {
        this.#title.innerText = title;
    }

    setFirstButton(label, listener) {
        this.#setButton(this.#firstButton, label, listener);
    }

    setSecondButton(label, listener) {
        this.#setButton(this.#secondButton, label, listener);
    }

    #setButton(button, label, listener) {
        let dialog = this;
        if (label != null) {
            button.style.display = "block";
            button.innerText = label;
            button.onclick = function () {
                if (listener != null)
                    listener();
                dialog.#hide();
            }
        }
    }

    setOption(option) {
        if (option != null) {
            this.#option.innerText = option;
            this.#option.style.display = "block";
        } else {
            this.#option.style.display = "none";
        }
    }

    setValue(value, isFileName, readOnly, isPassword) {
        if (isFileName) {
            let ext = SalmonFileUtils.getExtensionFromFileName(value);
            if (ext != null && ext.length > 0)
                this.#input.setSelectionRange(0, value.length - ext.length - 1);
            else
                this.#input.setSelectionRange(0, value.length);
        } if (isPassword) {
            this.#input.type = "password";
        } else if (readOnly) {
            this.#input.readOnly = true;
        }
        this.#input.value = value;
        this.#input.style.display = "block";
    }

    show() {
        this.#modal.style.display = "block";
        if(this.#input != null)
            this.#input.focus();
    }

    #hide() {
        this.#modal.style.display = "none";
        this.#modal.parentElement.parentElement.removeChild(this.#modal.parentElement);
    }
}
