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
 * A menu bar that can be added to a Window.
 */
export class JMenuBar {
  #items = [];
  #widgets = [];
  #lastItem;
  menuContainer;
  static globalListenerSet = false;

  constructor() {
    JMenuBar.setupListener();
  }

  static setupListener() {
    if(JMenuBar.globalListenerSet)
      return;
    window.addEventListener("click", function (event) {
      if (!event.target.matches('.jmenu-dropbtn')) {
        var dropdowns = document.getElementsByClassName("jmenu-dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains("jmenu-visible")) {
            openDropdown.classList.remove("jmenu-visible");
          }
        }
      }
    });
    JMenuBar.globalListenerSet = true;
  }

  /**
   * 
   * @param {JMenuItem} item 
   */
  addMenuItem(item) {
    if (!(item instanceof JMenuItem))
      throw new Error("Can only add JMenuItem at the top level");
    this.#items.push(item);
  }

  addMenuWidget(widget) {
    if (!(widget instanceof JMenuWidget))
      throw new Error("Can only add JMenuWidget at the top level");
    this.#widgets.push(widget);
  }

  async getMenuBarElement() {
    let menuContainer = document.createElement("div");
    menuContainer.classList.add("jmenu-container");
    for (let item of this.#items) {
      let menuItemContainer = document.createElement("div");
      menuItemContainer.classList.add(item.name);
      menuItemContainer.classList.add("jmenu-dropdown");
      menuContainer.appendChild(menuItemContainer);

      let drpName = item.name + "DropDown";
      let menuItemButton = document.createElement("button");
      menuItemButton.onclick = () => this.onMenuClicked(drpName);
      menuItemButton.classList.add("jmenu-dropbtn");
      menuItemButton.innerText = item.title;
      menuItemContainer.appendChild(menuItemButton);

      let menuSubItems = document.createElement("div");
      menuSubItems.classList.add(drpName);
      menuSubItems.classList.add("jmenu-dropdown-content");
      menuItemContainer.appendChild(menuSubItems);

      for (let subItem of item.getChildren()) {
        let menuSubItem = document.createElement("a");
        menuSubItems.appendChild(menuSubItem);
        menuSubItem.onclick = subItem.onclick;

        let menuSubItemIcon = document.createElement("img");
        menuSubItemIcon.classList.add("jmenu-item-image");
        menuSubItemIcon.src = subItem.icon;
        menuSubItem.appendChild(menuSubItemIcon);

        let menuSubItemLabel = document.createElement("span");
        menuSubItemLabel.classList.add("jmenu-unselectable");
        menuSubItemLabel.innerText = subItem.title;
        menuSubItem.appendChild(menuSubItemLabel);
      }
    }
    for (let widget of this.#widgets) {
      let menuWidgetContainer = document.createElement("div");
      menuWidgetContainer.classList.add(widget.name);
      menuWidgetContainer.classList.add("jmenu-widget");
      menuWidgetContainer.innerHTML = await widget.onGetContent();
      menuContainer.appendChild(menuWidgetContainer);
    }
    this.menuContainer = menuContainer;
    return menuContainer;
  }

  onMenuClicked(el) {
    if (this.#lastItem)
      this.#lastItem.classList.remove("jmenu-visible");
    this.#lastItem = this.menuContainer.getElementsByClassName(el)[0];
    this.#lastItem.classList.toggle("jmenu-visible");
  }
}

/**
 * Top level menu item
 */
export class JMenuItem {
  #children = [];
  name;
  title;

  /**
   * Create a menu item.
   * @param {string} name The name
   * @param {string} title The title
   */
  constructor(name, title) {
    this.name = name;
    this.title = title;
  }

  /**
   * Add a subitem.
   * @param {JMenuSubItem} menuItem The subitem to be added
   */
  addMenuItem(menuItem) {
    if (!(menuItem instanceof JMenuSubItem))
      throw new Error("Can only add JMenuSubItem at the top level");
    this.#children.push(menuItem);
  }

  /**
   * Get the sub items
   * @returns The subitems
   */
  getChildren() {
    return this.#children;
  }
}

/**
 * Top level menu widget
 */
export class JMenuWidget {
  name;
  onGetContent;
  onAttached;

  /**
   * Create a menu widget.
   * @param {string} name The name
   * @param {function()} onGetContent The callback that gets the content
   * @param {function()} onAttached Callback when the widget gets attached
   */
  constructor(name, onGetContent, onAttached) {
    this.name = name;
    this.onGetContent = onGetContent;
    this.onAttached = onAttached;
  }
}

/**
 * A menu subitem that can be added to the MenuBar.
 */
export class JMenuSubItem {
  name;
  title;
  icon;
  onclick;

  /**
   * Create a menu subitem.
   * @param {string} name A unique name for each item in the menubar
   * @param {string} title The title
   * @param {string} icon The url of the icon to display
   * @param {function()} onclick The callback when item clicked.
   */
  constructor(name, title, icon, onclick) {
    this.name = name;
    this.title = title;
    this.icon = icon;
    this.onclick = onclick;
  }
}
