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

import { JWindow } from "./jwindow.js";

/**
 * Class used to display a dialog box
 */
export class JDialog extends JWindow {
    static dialogURL = import.meta.resolve("../../dialog.html");
    static dialogEditURL = import.meta.resolve("../../dialog_edit.html");
    static dialogSelectURL = import.meta.resolve("../../dialog_select.html");

    text;
    container;
    input;
    option;
    firstButton;
    secondButton;

    /**
     * Prompt with an editable text box
     * @param {string} title The title
     * @param {string} msg The message
     * @param {function(string)} OnEdit Onedit listener for the input text element
     * @param {string} value The initial text value
     * @param {boolean} isFileName True if the text should be highlighted as a filename
     * @param {boolean} readOnly True if read only
     * @param {boolean} isPassword True if the value should be hidden as a password
     * @param {string} option Label for an optional checkbox
     */
    static promptEdit(title, msg, OnEdit, value = "", isFileName = false, readOnly = false, isPassword = false, option = null) {
        setTimeout(() => {
            fetch(JDialog.dialogEditURL).then(async (response) => {
                let dialogContent = await response.text();
                let dialog = new JDialog();
                await dialog.init(dialogContent, msg, "Ok", null);
                dialog.setTitle(title);
                dialog.setValue(value, isFileName, readOnly, isPassword);
                dialog.setOption(option);
                dialog.setFirstButton("Ok", () => {
                    if (OnEdit != null)
                        OnEdit(dialog.input.value, dialog.option.checked);
                });
                await dialog.show();
            });
        });
    }

    /**
     * Show a dialog prompt for passwords
     * @param {string} title The title
     * @param {string} msg The message
     * @param {string[]} hints The hint
     * @param {string[]} values The initial values for each password
     * @param {boolean[]} isPasswords A list of booleans for each value indicating if it should be hidden as a password
     * @param {function(string[])} OnEdit Onedit listener
     */
    static promptCredentialsEdit(title, msg, hints, values, isPasswords, OnEdit) {
        setTimeout(() => {
            fetch(JDialog.dialogURL).then(async (response) => {
                let dialogContent = await response.text();
                let dialog = new JDialog();
                await dialog.init(dialogContent, msg, "Ok", null);
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
                await dialog.show();
            });
        });
    }

    static createTextField(hint, value, isPassword) {
        let valueText = document.createElement("div");
        valueText.classList.add("jdialog-text-input-container");
        let label = document.createElement("label");
        label.innerText = hint;
        label.classList.add("jdialog-text-input-label");
        valueText.appendChild(label);
        let text = document.createElement("input");
        text.classList.add("jdialog-text-input");
        text.value = value;
        valueText.appendChild(text);
        if (isPassword) {
            text.type = "password";
        }
        return valueText;
    }

    /**
     * Prompt user for action
     * 
     * @param {string} title The title
     * @param {*} body The contents
     * @param {string} buttonLabel1 The label for the first button
     * @param {function(string)} buttonListener1 Onclick listener for the first button
     * @param {string} buttonLabel2 The label for the second button
     * @param {function(string)} buttonListener2 Onclick listener for the second button
     */
    static promptDialog(title, body,
        buttonLabel1 = "Ok", buttonListener1 = null,
        buttonLabel2 = null, buttonListener2 = null) {
        setTimeout(() => {
            fetch(JDialog.dialogURL).then(async (response) => {
                let dialogContent = await response.text();
                let dialog = new JDialog();
                await dialog.init(dialogContent, body, null, null);
                dialog.setTitle(title);
                dialog.setFirstButton(buttonLabel1, buttonListener1);
                dialog.setSecondButton(buttonLabel2, buttonListener2);
                await dialog.show();
            });
        });
    }

    /**
     * Prompt user for a selection from a list
     * @param {string} title The title
     * @param {string[]} items The items of the list
     * @param {int} currSelection The index of the default selection
     * @param {function(int)} onClickListener Onclick listener for the item selected
     */
    static promptSingleValue(title, items, currSelection, onClickListener) {
        setTimeout(() => {
            fetch(JDialog.dialogSelectURL).then(async (response) => {
                let dialogContent = await response.text();
                let dialog = new JDialog();
                await dialog.init(dialogContent, null, "Ok", null);
                dialog.setTitle(title);

                let selection = document.getElementsByName("jdialog-select")[0];
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
                dialog.setSecondButton("Cancel");
                await dialog.show();
            });
        });
    }
    
    async init(dialogContent, content, buttonListener1 = null, buttonListener2 = null) {
        this.isModal = true;
        this.createRoot(dialogContent);
        this.setupControls();
        this.setupIcon();
        this.setupEventListeners();
        this.#setTextContent(content);
        this.enableDraggable(true);
        this.setFirstButton("Ok", buttonListener1);
        if (buttonListener2 != null)
            this.setSecondButton("Cancel", buttonListener2);
    }

    setupControls() {
        super.setupControls();
        this.text = this.root.getElementsByClassName("jwindow-text")[0];
        this.container = this.root.getElementsByClassName("jdialog-container")[0];
        this.input = this.root.getElementsByClassName("jdialog-input")[0];
        this.option = this.root.getElementsByClassName("jdialog-option")[0];
        this.optionText = this.root.getElementsByClassName("jdialog-option-text")[0];
        this.firstButton = this.root.getElementsByClassName("jdialog-button-first")[0];
        this.secondButton = this.root.getElementsByClassName("jdialog-button-second")[0];
        this.windowPanel.style.resize = "none";
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
        let ext = this.getExtensionFromFileName(value);
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

    getExtensionFromFileName(fileName) {
        if (fileName == null)
            return "";
        let index = fileName.lastIndexOf(".");
        if (index >= 0) {
            return fileName.substring(index + 1);
        }
        else
            return "";
    }
}
