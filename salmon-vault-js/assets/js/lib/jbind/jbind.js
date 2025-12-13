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

import { ObservableList } from "./observable_list.js";
import { StringProperty } from "./string_property.js";
import { DoubleProperty } from "./double_property.js";
import { BooleanProperty } from "./boolean_property.js";
import { ObjectProperty } from "./object_property.js";
import { Property } from "./property.js";

/**
 * Binder class
 */
export class JBind {
    static #bindings = {};
    
    /**
     * Binds a bindable object (property, observable_list) to a DOM element
     * @param {any} root The root DOM element (usually document)
     * @param {string} id The DOM element id or name
     * @param {string} field The field of the DOM element (value,innerText,visibility,etc)
     * @param {Property|ObservableList} obj The observable object
     * @returns {Property|ObservableList} The element object
     */
    static bind(root, id, field, obj) {
        let el = JBind.getElement(root, id);
        if (el == undefined)
            throw new Error("Could not find document element: " + id);
        let objBinding = { id: id, field: field, obj: obj, root: root };
        let key = id + ":" + field;
        if (el.tagName.toLowerCase() === 'table') {
            if (field === 'tbody' && obj instanceof ObservableList) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObservableList to table body");
        } else if (el.tagName.toLowerCase() === 'span') {
            if (field === 'innerText' && obj instanceof StringProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind string to span value");
        } else if (el.tagName.toLowerCase() === 'input' && el.type === 'text') {
            if (field === 'value' && obj instanceof StringProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind StringProperty to input text value");
        } else if (el.tagName.toLowerCase() === 'progress' && field == 'value') {
            if (obj instanceof DoubleProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind DoubleProperty to progress value");
        } else if (field === 'display') {
            if (obj instanceof BooleanProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind BooleanProperty to display value");
        } else if (field === 'visibility') {
            if (obj instanceof BooleanProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind BooleanProperty to visibility value");
        } else if (el.tagName.toLowerCase() === 'img' && field === 'src') {
            if (obj instanceof ObjectProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObjectProperty to img src");
        } else if (el.tagName.toLowerCase() === 'textarea' && field === 'textContent') {
            if (obj instanceof StringProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObjectProperty to img src");
        } else if (el.tagName.toLowerCase() === 'input' && el.type == 'checkbox' && field === 'value') {
            if (obj instanceof BooleanProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind BooleanProperty to input checkbox");
        } else if (el.tagName.toLowerCase() === 'select' && field === 'options') {
            if (obj instanceof ObservableList) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObservableList to select options");
        } else if (el.tagName.toLowerCase() === 'video' && field === 'src') {
            if (obj instanceof StringProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObservableList to select options");
        } else if (el.tagName.toLowerCase() === 'iframe' && field === 'src') {
            if (obj instanceof ObjectProperty) {
                JBind.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObjectProperty to iframe src");
        } else {
            throw new Error("Could not bind element: " + id);
        }
        return obj;
    }

    static #checkCaller() {
        let stackTrace = (new Error()).stack.split("\n");
        for(let call of stackTrace) {
            if(call.includes("jbind/") && !call.includes("jbind.js"))
                return;
        }
        throw new Error("Do not call this method directly use property methods instead");
    }

    /**
     * Set the value of an observable
     * @param {any} obj The observable property object
     * @param {any} value The value
     */
    static setValue(obj, value) {
        this.#checkCaller();
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName == 'INPUT' && el.type == 'checkbox' && binding.field == 'value') {
            el.checked = value;
        } else if (binding.field == 'value') {
            el.value = value;
        } else if (binding.field == 'innerText') {
            el.innerText = value;
        } else if (binding.field == 'innerHtml') {
            el.innerHtml = value;
        } else if (binding.field == 'textContent') {
            el.textContent = value;
        } else if (binding.field == 'tbody') {
            if (value == null) {
                let tbody = el.getElementsByTagName('tbody')[0];
                while (tbody.firstChild) {
                    tbody.removeChild(tbody.firstChild);
                }
            }
        } else if (binding.field == 'display') {
            if (value) {
                el.style.display = "block";
            } else {
                el.style.display = "none";
            }
        } else if (binding.field == 'visibility') {
            if (value) {
                el.style.visibility = "visible";
            } else {
                el.style.visibility = "collapse";
            }
        } else if (binding.field == 'src') {
            el.src = value;
        }
    }

    /**
     * Set the value of an item that is part of an observable list
     * @param {any} obj The observable list object
     * @param {number} index The index in the list
     * @param {string|any} value The value of the item as string or {name: name, value: value}
     * @param {function(any,number,any)} oncontextmenu Onrightclick listener
     */
    static setItemValue(obj, index, value, oncontextmenu) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName == 'SELECT' && binding.field == 'options') {
            var option = document.createElement('option');
            if((typeof(value)) === "string") {
                option.value = value;
                option.innerHTML = value;
            } else {
                option.value = value.value;
                option.innerHTML = value.name;
            }
            el.onchange = (event) => {
                obj.clearSelectedItems(false);
                obj.onSetSelected(el.selectedIndex, true);
            };
            el.appendChild(option);
        } else if (binding.field == 'tbody') {
            let th = el.getElementsByTagName('th');
            let tbody = el.getElementsByTagName('tbody')[0];
            let row = tbody.insertRow(index);
            row.id = el.id + "-row-" + index;
            row.oncontextmenu = (event) => {
                for (let i = 0; i < tbody.childNodes.length; i++) {
                    let r = tbody.childNodes[i];
                    r.classList.remove("tr-row-selected");
                }
                obj.clearSelectedItems();
                row.classList.add("tr-row-selected");
                obj.onSetSelected(row.sectionRowIndex, true);
                if(oncontextmenu)
                    oncontextmenu(obj, row.sectionRowIndex, event);
                event.stopPropagation();
                event.preventDefault();
            };
            row.classList.add("tr-row");
            row.onclick = (event) => {
                if (!event.ctrlKey && !event.shiftKey) {
                    for (let i = 0; i < tbody.childNodes.length; i++) {
                        let r = tbody.childNodes[i];
                        r.classList.remove("tr-row-selected");
                    }
                }
                if (event.ctrlKey && row.classList.contains("tr-row-selected")) {
                    row.classList.remove("tr-row-selected");
                    obj.onSetSelected(row.sectionRowIndex, false);
                } else {
                    let lastSelection = binding.obj.getLastSelection();
                    if (event.shiftKey && lastSelection >= 0) {
                        let startSelection = Math.min(row.sectionRowIndex, lastSelection);
                        let endSelection = Math.max(row.sectionRowIndex, lastSelection);
                        for (let i = startSelection; i <= endSelection; i++) {
                            let r = tbody.childNodes[i];
                            obj.onSetSelected(i, true);
                            r.classList.add("tr-row-selected");
                        }
                    } else {
                        if (!event.ctrlKey) {
                            obj.clearSelectedItems();
                        }
                        obj.onSetSelected(row.sectionRowIndex, true);
                        row.classList.add("tr-row-selected");
                        obj.onClicked(event, row.sectionRowIndex);
                    }
                }
            }
            row.ondblclick = (event) => {
                for (let i = 0; i < tbody.childNodes.length; i++) {
                    let r = tbody.childNodes[i];
                    r.classList.remove("tr-row-selected");
                }
                row.classList.add("tr-row-selected");
                obj.onSetSelected(row.sectionRowIndex, true);
                obj.onDoubleClicked(event, row.sectionRowIndex);
            }
            row.onmouseenter = (event) => {
                obj.onMouseEntered(event, row.sectionRowIndex);
            }
            for (let i = 0; i < th.length; i++) {
                let column = th[i];
                let propertyName = column.getAttribute("name");
                let cell = row.insertCell(i);
                cell.classList.add("td-cell");
                for (let i = 0; i < column.classList.length; i++) {
                    if (!column.classList[i].startsWith("th-"))
                        cell.classList.add("data-" + column.classList[i]);
                }
                let content = value[propertyName];
                if (column.getAttribute("type") == "image") {
                    while (cell.firstChild) {
                        cell.removeChild(cell.firstChild);
                    }
                    if (content != null) {
                        cell.appendChild(content);
                    }
                } else if (column.getAttribute("type") == "text") {
                    if (content == null)
                        content = "";
                    cell.innerText = content;
                }
            }
        }
    }

    /**
     * Remove an item that is part of an observable list
     * @param {any} obj The observable list object
     * @param {number} index The index in the list
     */
    static removeItem(obj, index) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        if (binding.field == 'tbody') {
            let th = el.getElementsByTagName('th');
            let tbody = el.getElementsByTagName('tbody')[0];
            tbody.deleteRow(index);
        }
    }

    /**
     * Set the field of an item that is part of an observable list object
     * @param {any} obj The object
     * @param {number} index The index in the list
     * @param {string} field The field name
     * @param {string|any} value The value
     */
    static setItemFieldValue(obj, index, field, value) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        if (binding.field == 'tbody') {
            let th = el.getElementsByTagName('th');
            let tbody = el.getElementsByTagName('tbody')[0];
            let row = tbody.childNodes[index];
            for (let i = 0; i < th.length; i++) {
                let cell = row.childNodes[i];
                let column = th[i];
                let propertyName = column.getAttribute("name");
                if (propertyName == field) {
                    if (column.getAttribute("type") == "image") {
                        while (cell.firstChild) {
                            cell.removeChild(cell.firstChild);
                        }
                        if (value != null) {
                            cell.appendChild(value);
                        }
                    } else if (column.getAttribute("type") == "text") {
                        if (value == null)
                            value = "";
                        cell.innerText = value;
                    }
                }
            }
        }
    }

    /**
     * Get the current binding
     * @param {any} obj The observable object (property,observable_list) 
     * @returns The binding
     */
    static getBinding(obj) {
        if (!(obj.key in this.#bindings))
            throw new Error("Could not find element");
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el == undefined)
            throw new Error("Could not find document element: " + binding.id);
        return binding;
    }

    /**
     * Get the binded DOM element by the bind id or name
     * @param {any} root The DOM root
     * @param {string} id The element bind id or name
     * @returns The element
     */
    static getElement(root, id) {
        let el;
        if (root.getElementById)
            el = root.getElementById(id);
        if (!el && root.getElementsByName)
            el = root.getElementsByName(id)[0];
        if(!el)
            el = root.getElementsByClassName(id)[0];
        return el;
    }

    /**
     * Set the focus of an observable object
     * @param {any} obj The observable object (observable_list, property)
     */
    static setFocus(obj) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        el.focus();
    }

    /**
     * Get the value of an observable property object
     * @param {any} obj The observable property
     * @returns The value
     */
    static getValue(obj) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName == 'INPUT' && el.type == 'checkbox' && binding.field == 'value') {
            return el.checked;
        } else if (binding.field == 'value') {
            return el.value;
        } else if (binding.field == 'innerText') {
            return el.innerText;
        } else if (binding.field == 'innerHtml') {
            return el.innerHtml;
        } else if (binding.field == 'textContent') {
            return el.value;
        } else if (binding.field == 'display') {
            return el.style.display != "none";
        } else if (binding.field == 'visibility') {
            return el.style.visibility == "visible";
        } else if (binding.field == 'src') {
            return el.src;
        } else {
            throw new Error("Could not get value");
        }
    }

    /**
     * Get the selection start of a text object
     * @param {any} obj The observable property
     * @returns The current selection start
     */
    static getSelectionStart(obj) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName.toLowerCase() === 'textarea') {
            return el.selectionStart;
        } else if (el.tagName.toLowerCase() === 'input') {
            return el.selectionStart;
        } else {
            throw new Error("Could not get value");
        }
    }

    /**
     * Set the selection start of a text object
     * @param {any} obj The observable property
     * @param {number} value The value
     * @returns 
     */
    static setSelectionStart(obj, value) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName.toLowerCase() === 'textarea') {
            return el.selectionStart = value;
        } else if (el.tagName.toLowerCase() === 'input') {
            return el.selectionStart = value;
        } else {
            throw new Error("Could not set value");
        }
    }


    /**
     * Get the current selectionEnd of a binded DOM element
     * @param {any} obj The observable property
     * @returns The current selectionEnd
     */
    static getSelectionEnd(obj) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName.toLowerCase() === 'textarea') {
            return el.selectionEnd;
        } else if (el.tagName.toLowerCase() === 'input') {
            return el.selectionEnd;
        } else {
            throw new Error("Could not get value");
        }
    }

    /**
     * Set the selection end of an observable object
     * @param {any} obj The observable property
     * @param {string|any} value The value
     * @returns The new value
     */
    static setSelectionEnd(obj, value) {
        let binding = this.#bindings[obj.key];
        let el = JBind.getElement(binding.root, binding.id);
        if (el.tagName.toLowerCase() === 'textarea') {
            return el.selectionEnd = value;
        } else if (el.tagName.toLowerCase() === 'input') {
            return el.selectionEnd = value;
        } else {
            throw new Error("Could not set value");
        }
    }

    /**
     * Set the value of an item in a list
     * @param {any} obj The observable list
     * @param {number} index The index of the list
     * @param {string|any} value The value
     */
    static setItemSelect(obj, index, value) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        if (binding.field == 'tbody') {
            let tbody = el.getElementsByTagName('tbody')[0];
            let row = tbody.childNodes[index];
            if (value)
                row.classList.add("tr-row-selected");
            else
                row.classList.remove("tr-row-selected");
            obj.onSetSelected(index, value);
        } else if (binding.field == 'options') {
            el.selectedIndex = value ? index : -1;
        }
    }


    /**
     * Get the focus of an observable object
     * @param {any} obj The observable object (property, observable_list, etc)
     * @returns True if focused
     */
    static isFocused(obj) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        return document.activeElement == el;
    }

    /**
     * Bring the item of an observable list into view
     * @param {any} obj The observable list object
     * @param {number} index The index of the list
     */
    static bringIntoView(obj, index) {
        let binding = JBind.getBinding(obj);
        let el = JBind.getElement(binding.root, binding.id);
        var rows = el.rows;
        rows[index].scrollIntoView({behavior: 'smooth', block: 'center', container: 'nearest'});
    }
}