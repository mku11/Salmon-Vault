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

export class Binding {
    static #bindings = {};
    static bind(root, name, elementField, obj) {
        let el = Binding.getElement(root, name);
        if (el == undefined)
            throw new Error("Could not find document element: " + name);
        let objBinding = { name: name, field: elementField, obj: obj, root: root };
        let key = name + ":" + elementField;
        if (el.tagName.toLowerCase() === 'table') {
            if (elementField === 'tbody' && obj instanceof ObservableList) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObservableList to table body");
        } else if (el.tagName.toLowerCase() === 'span') {
            if (elementField === 'value' && obj instanceof StringProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind string to span value");
        } else if (el.tagName.toLowerCase() === 'input' && el.type === 'text') {
            if (elementField === 'value' && obj instanceof StringProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind StringProperty to input text value");
        } else if (el.tagName.toLowerCase() === 'progress') {
            if (elementField === 'value' && obj instanceof DoubleProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind DoubleProperty to progress value");
        } else if (elementField === 'display') {
            if (obj instanceof BooleanProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind BooleanProperty to display value");
        } else if (elementField === 'visibility') {
            if (obj instanceof BooleanProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind BooleanProperty to visibility value");
        } else if (el.tagName.toLowerCase() === 'img' && elementField === 'src') {
            if (obj instanceof ObjectProperty) {
                Binding.#bindings[key] = objBinding;
                obj.key = key;
            } else
                throw new Error("Can only bind ObjectProperty to img src");
        } else {
            throw new Error("Could not bind element: " + name);
        }
        return obj;
    }

    static setValue(obj, value) {
        let binding = this.#bindings[obj.key];
        let el = Binding.getElement(binding.root, binding.name);
        if (binding.field == 'value') {
            if (el.value !== undefined)
                el.value = value;
            else if (el.tagName.toLowerCase() === 'span')
                el.innerText = value;
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

    static setItemValue(obj, index, value) {
        let binding = Binding.getBinding(obj);
        let el = Binding.getElement(binding.root, binding.name);
        if (binding.field == 'tbody') {
            let th = el.getElementsByTagName('th');
            let tbody = el.getElementsByTagName('tbody')[0];
            let row = tbody.insertRow(index);
            row.id = el.id + "-row-" + index;
            $(function () {
                $.contextMenu({
                    selector: "#" + row.id,
                    build: function ($trigger, e) {
                        for (let i = 0; i < tbody.childNodes.length; i++) {
                            let r = tbody.childNodes[i];
                            r.classList.remove("tr-row-selected");
                        }
                        let trow = tbody.childNodes[index];
                        trow.classList.add("tr-row-selected");
                        obj.onSetSelected(index);
                        return {
                            items: obj.getContextMenu()
                        };
                    }
                });
            });
            row.classList.add("tr-row");
            row.onclick = (event) => {
                for (let i = 0; i < tbody.childNodes.length; i++) {
                    let r = tbody.childNodes[i];
                    r.classList.remove("tr-row-selected");
                }
                row.classList.add("tr-row-selected");
                obj.onSetSelected(index);
                obj.onClicked(event, index);
            }
            row.ondblclick = (event) => {
                for (let i = 0; i < tbody.childNodes.length; i++) {
                    let r = tbody.childNodes[i];
                    r.classList.remove("tr-row-selected");
                }
                let trow = tbody.childNodes[index];
                trow.classList.add("tr-row-selected");
                obj.onSetSelected(index);
                obj.onDoubleClicked(event, index);
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

    static setItemFieldValue(obj, index, field, value) {
        let binding = Binding.getBinding(obj);
        let el = Binding.getElement(binding.root, binding.name);
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

    static getBinding(obj) {
        if (!(obj.key in this.#bindings))
            throw new Error("Could not find element");
        let binding = this.#bindings[obj.key];
        let el = Binding.getElement(binding.root, binding.name);
        if (el == undefined)
            throw new Error("Could not find document element: " + binding.name);
        return binding;
    }

    static getElement(root, name) {
        if(root.getElementById != undefined)
            return root.getElementById(name);
        else
            return root.getElementsByClassName(name)[0];
    }
}