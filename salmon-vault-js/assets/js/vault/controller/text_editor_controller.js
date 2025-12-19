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

import { JBind } from "../../lib/jbind/jbind.js";
import { StringProperty } from "../../lib/jbind/string_property.js";
import { JWindow } from "../../lib/jwin/assets/js/jwindow.js";
import { SalmonTextEditor } from "../../common/model/salmon_text_editor.js";
import { MemoryStream } from "../../lib/simple-io/streams/memory_stream.js";
import { SalmonVaultManager } from "../../common/model/salmon_vault_manager.js";
import { JDialog } from "../../lib/jwin/assets/js/jdialog.js";
import { ServiceLocator } from "../../common/services/service_locator.js";
import { IKeyboardService } from "../../common/services/ikeyboard_service.js";
import { JMenuBar, JMenuItem, JMenuSubItem, JMenuWidget } from "../../lib/jwin/assets/js/jmenu_bar.js";

export class TextEditorController {
    static contentURL = "text-editor.html";
    static searchWidgetUrl = "text-search-widget.html";
    static iconsUrl = "assets/images/common-res/icons";
	static checkIntegrity = false; // disable integrity because github is reporting wrong content-length for http files

    /**
     * The content window
     * @type {JWindow}
     */
    contentWindow;
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

    /**
     * Set the content window
     * @param {JWindow} contentWindow 
     */
    setStage(contentWindow) {
        this.contentWindow = contentWindow;
        this.searchText = JBind.bind(this.contentWindow.getWindowPanel(), 'search-text', 'value', new StringProperty());
        this.contentArea = JBind.bind(this.contentWindow.getWindowPanel(), 'text-editor-text', 'textContent', new StringProperty());
        this.status = JBind.bind(this.contentWindow.getWindowPanel(), 'text-editor-status', 'innerText', new StringProperty());
        this.initialize();
    }

    setupMenuBar(contentWindow) {
        let menuBar = new JMenuBar();

        let fileMenuItem = new JMenuItem("fileMenu", "File");
        menuBar.addMenuItem(fileMenuItem);
        fileMenuItem.addMenuItem(new JMenuSubItem("save", "Save File (Ctrl-S)",
            TextEditorController.iconsUrl + "/save_small.png", () => { this.onSave(); }));
        fileMenuItem.addMenuItem(new JMenuSubItem("newVault", "Close",
            TextEditorController.iconsUrl + "/exit_small.png", () => { this.close(); }));

        let searchWidget = new JMenuWidget("searchText", this.#getSearchWidgetHtml);
        menuBar.addMenuWidget(searchWidget);

        contentWindow.setMenuBar(menuBar);
    }

    static async openTextEditor(fileViewModel, owner) {
        let controller = new TextEditorController();
        window.textEditorController = controller;
        let contentWindow = await JWindow.createWindowWithURL("Text Editor", this.contentURL);
        controller.setupMenuBar(contentWindow);
        contentWindow.onClose = () => controller.onClose(this);
        await contentWindow.show();
        controller.setStage(contentWindow);
        controller.showTaskMessage("File loading");
        setTimeout(async () => {
            await controller.load(fileViewModel);
        });
    }

    async #getSearchWidgetHtml() {
        return new Promise((resolve, reject) => {
            fetch(TextEditorController.searchWidgetUrl).then(async (response) => {
                let content = await response.text();
                resolve(content);
            });
        });
    }

    async load(item) {
        this.item = item;
        let content;
        try {
			let file = this.item.getAesFile();
			await file.setVerifyIntegrity(TextEditorController.checkIntegrity);
            content = await this.getTextContent(file);
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
        let oldFile = this.item.getAesFile();
        try {
            let targetFile = await this.editor.onSave(this.item.getAesFile(), this.contentArea.get());
            if (targetFile == null) {
                throw new Error("Could not save file");
            }
            let index = SalmonVaultManager.getInstance().getFileItemList().indexOf(oldFile);
            if (index >= 0) {
                SalmonVaultManager.getInstance().getFileItemList().splice(index, 1);
                SalmonVaultManager.getInstance().getFileItemList().splice(index, 0, targetFile);
            }
            this.item.setSalmonFile(targetFile);
            this.showTaskMessage("File saved");
            setTimeout(() => {
                this.showTaskMessage("");
            }, 2000);
        } catch (e) {
            console.error(e);
            JDialog.promptDialog("Error", "Could not save file: " + e);
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
            setTimeout(() => this.onSave());
        } else if (this.metaKeysPressed.has('Control') && this.keysPressed.has("F")) {
            this.onFind();
        } else if (this.contentArea.isFocused() && this.keysPressed.has("TAB")) {
            document.execCommand('insertText', false, ' '.repeat(4));
        } else {
            return false;
        }
        return true;
    }

    onFind() {
        this.searchText.focus();
        this.searchText.setSelectionAll();
    }

    onSearchKeyPressed(event) {
        if (event.key == 'ENTER') {
            this.onSearch();
        }
    }

    onSearch() {
        this.search(this.searchText.get(),
            this.contentArea.getSelectionEnd() - this.contentArea.getSelectionStart() > 0 ?
                this.contentArea.getSelectionStart() + 1 : this.contentArea.getSelectionStart());
    }

    search(text, caretPosition) {
        let searchStart;
        if (this.currentCaretPosition == -1) {
            searchStart = 0;
        } else {
            searchStart = this.currentCaretPosition;
        }
        let start = this.contentArea.get().indexOf(text, searchStart);
        if (start >= 0) {
            this.selectAndScrollTo(start, text.length);
            this.currentCaretPosition = start + 1;
        } else {
            this.currentCaretPosition = -1;
        }
    }

    selectAndScrollTo(start, length) {
        setTimeout(() => {
            this.contentArea.focus();
            this.contentArea.setSelectionStart(start);
            this.contentArea.setSelectionEnd(start + length);
        });
    }

    close() {
        this.contentWindow.hide();
    }

    onClose(self) {
        this.removeOnKeyboardShortcuts();
    }

    removeOnKeyboardShortcuts() {
        ServiceLocator.getInstance().resolve(IKeyboardService).removeOnKeyListener(this.onKeyListener);
        ServiceLocator.getInstance().resolve(IKeyboardService).removeOnMetaKeyListener(this.onMetaKeyListener);
    }
}
