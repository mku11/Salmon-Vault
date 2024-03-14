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

import { SalmonWindow } from "../window/salmon_window.js";
import { SalmonTextEditor } from "../../common/model/salmon_text_editor.js";
import { Binding } from "../../common/binding/binding.js";
import { StringProperty } from "../../common/binding/string_property.js";
import { WindowUtils } from "../utils/window_utils.js";
import { SalmonConfig } from "../config/salmon_config.js";
import { MemoryStream } from "../../lib/salmon-core/io/memory_stream.js";
import { SalmonVaultManager } from "../../common/model/salmon_vault_manager.js";
import { SalmonDialog } from "../dialog/salmon_dialog.js";
import { ServiceLocator } from "../../common/services/service_locator.js";
import { IKeyboardService } from "../../common/services/ikeyboard_service.js";

export class TextEditorController {
    static modalURL = "text-editor.html";
    modalWindow;
    item;
    contentArea;
    searchText;
    status;
    currentCaretPosition = 0;
    editor;

    keysPressed = new Set();
    metaKeysPressed = new Set();

    onKeyListener;
    onMetaKeyListener;

    initialize() {
        this.editor = new SalmonTextEditor();
        this.setupKeyboardShortcuts();
    }

    setStage(modalWindow) {
        this.modalWindow = modalWindow;
        this.contentArea = Binding.bind(this.modalWindow, 'text-editor-text', 'textContent', new StringProperty());
        this.searchText = Binding.bind(this.modalWindow, 'search-text', 'value', new StringProperty());
        this.status = Binding.bind(this.modalWindow, 'text-editor-status', 'innerText', new StringProperty());
        this.initialize();
    }

    static openTextEditor(fileViewModel, owner) {
        fetch(TextEditorController.modalURL).then(async (response) => {
            let htmlText = await response.text();
            let controller = new TextEditorController();
            window.textEditorController = controller;
            let modalWindow = await SalmonWindow.createModal("Text Editor", htmlText);
            controller.setStage(modalWindow.getRoot());
            await controller.load(fileViewModel);
            WindowUtils.setDefaultIconPath(SalmonConfig.APP_ICON);
            modalWindow.show();
            modalWindow.onClose = () => controller.onClose(this);
        });
    }

    async load(item) {
        this.item = item;
        let content;
        try {
            content = await this.getTextContent(this.item.getSalmonFile());
            this.contentArea.set(content);
            this.showTaskMessage("File loaded");
            setTimeout(() => {
                this.showTaskMessage("");
            }, 2000);
            this.contentArea.focus();
        } catch (e) {
            console.error(e);
        }
    }

    async getTextContent(file) {
        let stream = await file.getInputStream();
        let ms = new MemoryStream();
        await stream.copyTo(ms);
        await stream.close();
        let bytes = ms.toArray();
        let content = new TextDecoder().decode(bytes);
        return content;
    }

    async onSave() {
        let oldFile = this.item.getSalmonFile();
        let targetFile = await this.editor.onSave(this.item.getSalmonFile(), this.contentArea.get());
        let index = SalmonVaultManager.getInstance().getFileItemList().indexOf(oldFile);
        if (index >= 0) {
            SalmonVaultManager.getInstance().getFileItemList().splice(index, 1);
            SalmonVaultManager.getInstance().getFileItemList().splice(index, 0, targetFile);
        }
        try {
            this.item.setSalmonFile(targetFile);
            this.showTaskMessage("File saved");
            setTimeout(() => {
                this.showTaskMessage("");
            }, 2000);
        } catch (e) {
            console.error(e);
            SalmonDialog.promptDialog("Error", "Could not save file: " + e);
        }
    }

    showTaskMessage(msg) {
        setTimeout(() => {
            this.status.set(msg != null ? msg : "");
        });
    }

    setupKeyboardShortcuts() {
        this.onMetaKeyListener = (e) => this.onMetaKey(e, this);
        this.onKeyListener = (e) => this.onKey(e, this);
        ServiceLocator.getInstance().resolve(IKeyboardService).addOnKeyListener(this.onKeyListener);
        ServiceLocator.getInstance().resolve(IKeyboardService).addOnMetaKeyListener(this.onMetaKeyListener);
    }

    onMetaKey(e, self) {
        let detected;
        if (e.type == 'keydown') {
            self.metaKeysPressed.add(e.key);
            detected = self.detectShortcuts();
        } else {
            self.metaKeysPressed.delete(e.key);
        }
        return detected;
    }

    onKey(e, self) {
        let detected;
        if (e.type == 'keydown') {
            self.keysPressed.add(e.key.toUpperCase());
            detected = self.detectShortcuts();
        } else if (!e.Down && e.key == "Enter") {
            // workaround for Enter
            self.keysPressed.add(e.key.toUpperCase());
            detected = self.detectShortcuts();
            self.keysPressed.delete(e.key.toUpperCase());
        }
        else
            self.keysPressed.delete(e.key.toUpperCase());
        return detected;
    }

    detectShortcuts() {
        if (this.metaKeysPressed.has('Control') && this.keysPressed.has("S")) {
            setTimeout(()=>this.onSave());
        } else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("F")) {
            this.onFind();
        } else {
            return false;
        }
        return true;
    }

    onFind() {
        this.searchText.focus();
        this.searchText.selectAll();
    }
    
    onSearchKeyPressed(event) {
        if(event.key == 'ENTER') {
            this.onSearch();
        }
    }

    onSearch() {
        this.search(this.searchText.get(), this.contentArea.getCaretPosition() - contentArea.getAnchor() > 0 ? this.contentArea.getAnchor() + 1 : this.contentArea.getAnchor());
    }

    search(text, caretPosition) {
        let searchStart;
        if (this.currentCaretPosition == -1) {
            searchStart = 0;
        } else if (this.currentCaretPosition != caretPosition) {
            searchStart = caretPosition;
        } else {
            searchStart = this.currentCaretPosition;
        }
        let start = this.contentArea.get().indexOf(text, searchStart);
        if (start >= 0) {
            this.selectAndScrollTo(start, text.length());
            this.currentCaretPosition = start + 1;
        } else {
            this.currentCaretPosition = -1;
        }
    }

    selectAndScrollTo(start, length) {
        setTimeout(() => {
            this.contentArea.focus();
            this.contentArea.positionCaret(start);
            this.contentArea.selectPositionCaret(start + length);
            this.searchText.focus();
        });
    }

    onClose(self) {
        this.removeOnKeyboardShortcuts();
    }

    removeOnKeyboardShortcuts() {
        ServiceLocator.getInstance().resolve(IKeyboardService).removeOnKeyListener(this.onKeyListener);
        ServiceLocator.getInstance().resolve(IKeyboardService).removeOnMetaKeyListener(this.onMetaKeyListener);
    }
}
