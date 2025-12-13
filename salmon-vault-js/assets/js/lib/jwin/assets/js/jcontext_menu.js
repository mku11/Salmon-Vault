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
 * Class used to display a context menu
 */
export class JContextMenu extends JWindow {
    static htmlURL = import.meta.resolve("../../context_menu.html");

    /**
     * Display a context menu
     * @param {string} title 
     * @param {any[]} menu 
     * @param {number} x The x coordinate for the window to display
     * @param {number} y The y coordinate for the window to display
     */
    static showContextMenu(title, menu, x, y) {
        setTimeout(() => {
            fetch(JContextMenu.htmlURL).then(async (response) => {
                let contextMenuContent = await response.text();
                let dialog = new JContextMenu();
                await dialog.init(contextMenuContent, menu);
                dialog.setTitle(title);
                await dialog.show();
                dialog.getWindowPanel().style.left = x + "px";
                dialog.getWindowPanel().style.top = y + "px";
            });
        });
    }

    async init(contextMenuContent, menu) {
        await this.createRoot(contextMenuContent);
        this.setupControls();
        this.setupIcon();
        this.setMenu(menu);
        this.enableDraggable(false);
        this.enableDismissable(false);
        this.enableDismissableOutside(true);
    }

    async createRoot(contextMenuContent) {
        let docBody = document.getElementsByTagName("body")[0];
        var div = document.createElement('div');
        div.id = "jcontext-menu-" + Math.floor(Math.random() * 100000000);
        div.innerHTML = contextMenuContent;
        docBody.appendChild(div);
        this.root = div;
    }

    setMenu(menu) {
        let contextMenuDiv = this.root.getElementsByClassName('jcontext-menu-content')[0];
        for (let [k, v] of Object.entries(menu)) {
            let menuItemDiv = document.createElement('a');
            let menuItemImage = document.createElement("img");
            let menuItemText = document.createTextNode(v.name);
            menuItemImage.classList.add("jmenu-item-image");
            menuItemImage.classList.add("jcontext-menu-item-image");
            menuItemImage.src = v.icon;
            menuItemDiv.style.cursor = "pointer";
            menuItemDiv.appendChild(menuItemImage);
            menuItemDiv.onclick = () => {
                this.hide();
                v.callback();
            };
            menuItemDiv.append(menuItemText);
            contextMenuDiv.appendChild(menuItemDiv);
        }
    }

    setupControls() {
        super.setupControls();
        this.windowPanel.style.resize = "none";
    }
}