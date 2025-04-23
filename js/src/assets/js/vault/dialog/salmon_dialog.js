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

import { FileUtils } from "../../lib/salmon-fs/fs/drive/utils/file_utils.js";
import { SalmonWindow } from "../window/salmon_window.js";

export class SalmonDialog extends SalmonWindow {
    static dialogURL = "dialog.html";
    static dialogEditURL = "dialog_edit.html";
    static dialogSelectURL = "dialog_select.html";

    text;
    container;
    input;
    option;
    firstButton;
    secondButton;

    constructor(content, buttonListener1 = null, buttonListener2 = null, root = document) {
        super(null, root);
        this.root = root;
        this.setupControls();
        this.setupIcon();
        this.setupEventListeners();
        this.#setTextContent(content);
        this.setFirstButton("Ok", buttonListener1);
        if (buttonListener2 != null)
            this.setSecondButton("Cancel", buttonListener2);
    }

    /**
     * Prompt with an editable text box
     * @param {string} title 
     * @param {string} msg 
     * @param {*} OnEdit 
     * @param {string} value 
     * @param {boolean} isFileName 
     * @param {boolean} readOnly 
     * @param {boolean} isPassword 
     * @param {boolean} option 
     */
    static promptEdit(title, msg, OnEdit, value = "", isFileName = false, readOnly = false, isPassword = false, option = null) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogEditURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(msg, "Ok", null, div);
                dialog.setTitle(title);
                dialog.setValue(value, isFileName, readOnly, isPassword);
                dialog.setOption(option);
                dialog.setFirstButton("Ok", () => {
                    if (OnEdit != null)
                        OnEdit(dialog.input.value, dialog.option.checked);
                });
                dialog.show();
            });
        });
    }

    /**
     * 
     * @param {string} title 
     * @param {string} msg 
     * @param {string[]} hints 
     * @param {string[]} values 
     * @param {boolean[]} isPasswords 
     * @param {*} OnEdit 
     */
    static promptCredentialsEdit(title, msg, hints, values, isPasswords, OnEdit) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(msg, "Ok", null, div);
                dialog.setTitle(title);
                // add the text boxes
                var divBody = document.createElement('div');
                let textFields = new Array(hints.length);
                for (let i = 0; i < hints.length; i++) {
                    if (hints[i] != null) {
                        textFields[i] = this.createTextField(hints[i], values[i], isPasswords[i]);
                        divBody.appendChild(textFields[i]);
                    }
                }
                dialog.setElementContent(divBody);
                dialog.setFirstButton("Ok", () => {
                    if (OnEdit != null) {
                        let texts = Array(hints.length);
                        for (let i = 0; i < textFields.length; i++) {
                            if (textFields[i] != null) {
                                let editText = textFields[i].getElementsByTagName("input")[0];
                                texts[i] = editText.value;
                            }
                        }
                        OnEdit(texts);
                    }
                });
                dialog.show();
            });
        });
    }

    /**
     * 
     * @param {*} hint 
     * @param {*} value 
     * @param {*} isPassword 
     * @returns 
     */
    static createTextField(hint, value, isPassword) {
        let valueText = document.createElement("div");
        valueText.classList.add("dialog-text-input-container");
        let label = document.createElement("label");
        label.innerText = hint;
        label.classList.add("dialog-text-input-label");
        valueText.appendChild(label);
        let text = document.createElement("input");
        text.classList.add("dialog-text-input");
        text.value = value;
        valueText.appendChild(text);
        if (isPassword) {
            text.type = "password";
        }
        return valueText;
    }

    static promptDialog(title, body,
        buttonLabel1 = "Ok", buttonListener1 = null,
        buttonLabel2 = null, buttonListener2 = null) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(body, null, null, div);
                dialog.setTitle(title);
                dialog.setFirstButton(buttonLabel1, buttonListener1);
                dialog.setSecondButton(buttonLabel2, buttonListener2);
                dialog.show();
            });
        });
    }

    static promptSingleValue(title, items, currSelection, onClickListener) {
        setTimeout(() => {
            fetch(SalmonDialog.dialogSelectURL).then(async (response) => {
                let docBody = document.getElementsByTagName("body")[0];
                var div = document.createElement('div');
                div.id = "modal-" + Math.floor(Math.random() * 1000000);
                div.innerHTML = await response.text();
                docBody.appendChild(div);
                let dialog = new SalmonDialog(null, "Ok", null, div);
                dialog.setTitle(title);

                let selection = document.getElementsByName("modal-select")[0];
                for(let i=0; i<items.length; i++) {
                    let option = document.createElement('option');
                    option.value = items[i];
                    option.innerHTML = items[i];
                    selection.appendChild(option);
                }
                if(currSelection >= 0)
                    selection.selectedIndex = currSelection;
                dialog.setFirstButton("Ok", () => {
                    if (onClickListener != null) {
                        onClickListener(selection.selectedIndex);
                    }
                });
                dialog.show();
            });
        });
    }

    setupControls() {
        super.setupControls();
        this.text = this.root.getElementsByClassName("modal-text")[0];
        this.container = this.root.getElementsByClassName("dialog-container")[0];
        this.input = this.root.getElementsByClassName("dialog-input")[0];
        this.option = this.root.getElementsByClassName("dialog-option")[0];
        this.optionText = this.root.getElementsByClassName("dialog-option-text")[0];
        this.firstButton = this.root.getElementsByClassName("dialog-button-first")[0];
        this.secondButton = this.root.getElementsByClassName("dialog-button-second")[0];
        this.modal.style.resize = "none";
    }

    #setTextContent(content) {
        this.text.innerText = content;
    }

    setElementContent(content) {
        this.container.appendChild(content);
    }

    setFirstButton(label, listener) {
        this.#setButton(this.firstButton, label, listener);
    }

    setSecondButton(label, listener) {
        this.#setButton(this.secondButton, label, listener);
    }

    #setButton(button, label, listener) {
        let dialog = this;
        if (label != null) {
            button.style.display = "block";
            button.innerText = label;
            button.onclick = function () {
                if (listener != null)
                    listener();
                dialog.hide();
            }
        }
    }

    setOption(option) {
        if (option != null) {
            this.optionText.innerText = option;
            this.option.style.display = "block";
        } else {
            this.option.style.display = "none";
        }
    }

    setValue(value, isFileName, readOnly, isPassword) {
        let ext = FileUtils.getExtensionFromFileName(value);
        if (isFileName) {
            this.onShow = () => {
                this.input.focus();
                if (ext != null && ext.length > 0) {
                    this.input.selectionStart = 0;
                    this.input.selectionEnd = value.length - ext.length - 1;
                } else {
                    this.input.selectionStart = 0;
                    this.input.selectionEnd = value.length;
                }
            };
        }
        if (isPassword) {
            this.input.type = "password";
            this.onShow = () => this.input.focus();
        } else if (readOnly) {
            this.input.readOnly = true;
        } else {
            this.onShow = () => this.input.focus();
        }
        this.input.value = value;
        this.input.style.display = "block";
    }
}
