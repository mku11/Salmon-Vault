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
 * Class used to display a window
 */
export class JWindow {
    static windowUrl = import.meta.resolve("../../window.html");
    static maximizedMargin = 32;
    static zIndex = 0;
    static #defaultIconPath;
    static visibleWindows = new Set();
    static globalListenerSet = false;

    root;
    icon;
    windowPanel;
    closeButton;
    titleBar;
    title;
    menu;
    content;
    onClose;
    onShow;
    isDraggable;
    isDismissable;
    isDismissableOutside;
    isModal = false;
    menuBar;
    lastLeft;
    lastTop;
    isMaximized=false;

    /**
     * Instantiate a window
     * DO NOT USE this directly, instead use the static methods like Window.createWindow()
     */
    constructor() {

    }

    /**
     * Get the window panel
     * @returns {Element} The window panel
     */
    getWindowPanel() {
        return this.windowPanel;
    }

    static setDefaultIconPath(iconPath) {
        JWindow.#defaultIconPath = iconPath;
    }

    static getDefaultIcon() {
        return JWindow.#defaultIconPath;
    }

    static getTopWindow() {
        let maxZIndex = 0;
        let topWindow;
        for (let window of JWindow.visibleWindows) {
            let zIndex = parseInt(window.windowPanel.style.zIndex);
            if (maxZIndex < zIndex) {
                maxZIndex = zIndex;
                topWindow = window;
            }
        }
        return topWindow;
    }

    setIconPath(iconPath) {
        this.icon.src = iconPath;
    }

    getIconPath() {
        return this.icon.src;
    }

    setupIcon() {
        this.icon.src = JWindow.#defaultIconPath;
    }

    /**
     * Set the menu bar
     * @param {MenuBar} menuBar The menu bar
     */
    setMenuBar(menuBar) {
        this.menuBar = menuBar;
    }

    /**
     * Create a modal window
     * @param {string} title The title of the window
     * @param {string} url The url that contains the html content in the window
     * @returns The window
     */
    static async createModalWithURL(title, url) {
        return JWindow.createWindowWithURL(title, url, true);
    }

    /**
     * Create a modal window
     * @param {string} title The title of the window
     * @param {string} content The html content of the window
     * @returns The window
     */
    static async createModal(title, content) {
        return JWindow.createWindow(title, content, true);
    }

    /**
     * Create a window
     * @param {string} title The title
     * @param {string} url The url that contains the html content in the window
     * @returns {JWindow} The window
     */
    static async createWindowWithURL(title, url) {
        return new Promise((resolve, reject) => {
            fetch(url).then(async (response) => {
                let content = await response.text();
                let window = JWindow.createWindow(title, content, false);
                resolve(window);
            });
        });
    }

    /**
     * Create a window
     * @param {string} title The title of the window
     * @param {string} content The html content of the window
     * @param {boolean} isModal True if window should be modal
     * @returns 
     */
    static async createWindow(title, content, isModal = false) {
        return new Promise(async (resolve, reject) => {
            fetch(JWindow.windowUrl).then(async (response) => {
                let windowContent = await response.text();
                let window = new JWindow();
                await window.init(windowContent, content);
                window.isModal = isModal;
                window.setTitle(title);
                resolve(window);
            });
        });
    }

    async init(windowContent, content) {
        JWindow.setupListeners();
        await this.createRoot(windowContent);
        this.setupControls();
        this.setupIcon();
        this.setupEventListeners();
        this.setContent(content);
        this.enableDraggable(true);
        this.enableDismissable(true);
        this.enableDismissableOutside(false);
    }

    async createRoot(windowContent) {
        let docBody = document.getElementsByTagName("body")[0];
        var div = document.createElement('div');
        div.id = "jwindow-" + Math.floor(Math.random() * 100000000);
        div.innerHTML = windowContent;
        docBody.appendChild(div);
        this.root = div;
    }

    setupControls() {
        this.windowPanel = this.root.getElementsByClassName("jwindow-panel")[0];
        this.icon = this.root.getElementsByClassName("jwindow-icon")[0];
        this.titleBar = this.root.getElementsByClassName("jwindow-title-bar")[0];
        this.title = this.root.getElementsByClassName("jwindow-title")[0];
        this.closeButton = this.root.getElementsByClassName("jwindow-close")[0];
        this.menu = this.root.getElementsByClassName("jwindow-menubar")[0];
        this.content = this.root.getElementsByClassName("jwindow-content")[0];
    }

    setupEventListeners() {
        let dialog = this;
        this.closeButton.onclick = function () {
            dialog.hide();
        }
        this.setDraggable(this.titleBar);
    }

    setDraggable(el) {
        let down;
        let dx, dy;
        let currWindow = this;

        el.addEventListener('mousedown', function (e) {
            if (!currWindow.isDraggable)
                return;
            event.preventDefault();
            down = true;
            dx = currWindow.windowPanel.offsetLeft - e.clientX;
            dy = currWindow.windowPanel.offsetTop - e.clientY;
            // set the global listener to prevent interruptions
            document.onmouseup = stopMoveElement;
            document.onmousemove = moveElement;
        }, true);

        function moveElement(event) {
            if (!currWindow.isDraggable)
                return;
            if (down) {
                currWindow.windowPanel.style.left = (event.clientX + dx) + 'px';
                currWindow.windowPanel.style.top = (event.clientY + dy) + 'px';
            }
            event.preventDefault();
        }

        function stopMoveElement(event) {
            if (!currWindow.isDraggable)
                return;
            event.preventDefault();
            down = false;
            // reset the global listener
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    /**
     * Set the width
     * @param {number} value The width
     */
    setWidth(value) {
        this.windowPanel.style.width = value + "px";
    }

    /**
     * Set the height
     * @param {number} value The height
     */
    setHeight(value) {
        this.windowPanel.style.height = value + "px";
    }

    setResizable(value) {
        this.windowPanel.style.resize = value ? "both" : "none";
    }

    /**
     * Allow the windows to be dragged
     * @param {boolean} value True to be able to drag the window
     */
    enableDraggable(value) {
        this.isDraggable = value;
        if (value === true)
            this.titleBar.style.cursor = "move";
        else
            this.titleBar.style.cursor = "auto";
    }

    /**
     * Allow the windows to be closed
     * @param {boolean} value True to be dismissed
     */
    enableDismissable(value) {
        this.isDismissable = value;
        if (value === true)
            this.closeButton.style.display = "block";
        else
            this.closeButton.style.display = "none";
    }

    /**
     * Allow the window to be closed when a click outside is detected
     * @param {boolean} value True to be dismissed
     */
    enableDismissableOutside(value) {
        this.isDismissableOutside = value;
    }

    setContent(content) {
        if (content != null) {
            var div = document.createElement('div');
            div.innerHTML = content;
            this.content.appendChild(div);
        }
    }

    /**
     * Set the title
     * @param {string} title The title
     */
    setTitle(title) {
        this.title.innerText = title;
    }

    /**
     * Display the window
     */
    async show() {
        this.windowPanel.style.display = "block";
        let width = window.innerWidth - JWindow.maximizedMargin*2;
        let height = window.innerHeight - JWindow.maximizedMargin*2;
        this.windowPanel.style.left = (width/2 - this.windowPanel.clientWidth/2) + "px";
        this.windowPanel.style.top = (height/2 - this.windowPanel.clientHeight/2) + "px";

        JWindow.zIndex += 2;
        this.windowPanel.style.zIndex = JWindow.zIndex;
        if (this.isModal)
            this.disableSiblings(true);
        await this.setupMenu();
        JWindow.visibleWindows.add(this);
        if (this.onShow != null)
            this.onShow();
    }

    static setupListeners() {
        if (JWindow.globalListenerSet)
            return;
        window.addEventListener("mousedown", function (event) {
            let topWindow = JWindow.getTopWindow();
            for (let jwindow of JWindow.visibleWindows) {
                let hit = JWindow.contains(jwindow.root, event.target);
                if (jwindow.isDismissableOutside && !hit) {
                    jwindow.hide.call(jwindow);
                }
                else if (hit && topWindow != jwindow && !topWindow.isModal) {
                    JWindow.zIndex += 2;
                    jwindow.windowPanel.style.zIndex = JWindow.zIndex;
                }
            }
        });
        window.addEventListener("dblclick", function (event) {
            let topWindow = JWindow.getTopWindow();
            for (let jwindow of JWindow.visibleWindows) {
                let hit = event.target.matches('.jwindow-title-bar');
                if (hit && topWindow == jwindow) {
                    if(jwindow.isMaximized) {
                        jwindow.windowPanel.style.left = jwindow.lastLeft;
                        jwindow.windowPanel.style.top = jwindow.lastTop;
                        jwindow.windowPanel.style.width = jwindow.lastWidth;
                        jwindow.windowPanel.style.height = jwindow.lastHeight;
                        jwindow.isMaximized = false;
                    } else if(jwindow.windowPanel.style.resize == "both") {
                        jwindow.lastLeft = jwindow.windowPanel.style.left;
                        jwindow.lastTop = jwindow.windowPanel.style.top;
                        jwindow.lastWidth = jwindow.windowPanel.style.width;
                        jwindow.lastHeight = jwindow.windowPanel.style.height;

                        let width = this.window.innerWidth - JWindow.maximizedMargin*2;
                        let height = this.window.innerHeight - JWindow.maximizedMargin*2;
                        jwindow.windowPanel.style.left = JWindow.maximizedMargin + "px";
                        jwindow.windowPanel.style.top = JWindow.maximizedMargin + "px";
                        jwindow.setWidth(width);
                        jwindow.setHeight(height);
                        jwindow.isMaximized = true;
                    }
                }
            }
        });
        JWindow.globalListenerSet = true;
    }

    static contains(parent, el) {
        while (el) {
            if (parent == el)
                return true;
            el = el.parentElement;
        }
        return false;
    }

    /**
     * Close the window
     */
    hide() {
        this.windowPanel.style.display = "none";
        if (this.isModal)
            this.disableSiblings(false);
        this.windowPanel.parentElement.parentElement.removeChild(this.windowPanel.parentElement);
        JWindow.visibleWindows.delete(this);
        if (this.onClose != null)
            this.onClose();
    }

    disableSiblings(value) {
        let parent = this.windowPanel.parentElement.parentElement;
        for (let i = parent.childNodes.length - 1; i >= 0; i--) {
            let element = parent.childNodes[i];
            if (element.style && element != this.windowPanel.parentElement) {
                if (value) {
                    element.classList.add("jwindow-close-disabled");
                } else {
                    element.classList.remove("jwindow-close-disabled");
                }
                break;
            }
        }
    }

    async setupMenu() {
        if (!this.menuBar)
            return;
        let el = await this.menuBar.getMenuBarElement();
        this.menu.appendChild(el);
    }
}