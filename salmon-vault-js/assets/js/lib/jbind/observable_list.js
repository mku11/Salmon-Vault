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

import {JBind } from "./jbind.js";
import { PropertyNotifier } from "./property_notifier.js";

/**
 * Observable list used for UI elements that host a collection of options or other element like select, table, etc
 */
export class ObservableList {
    key = null;
    #list = [];
    selected = new Set();
    lastSelection = -1;
    onSelectionChanged = [];
    onItemClicked = null;
    onItemDoubleClicked = null;
    onItemMouseEntered = null;
    
    async onDoubleClicked(event, index) {
        if(this.onItemDoubleClicked != null)
            this.onItemDoubleClicked(index);
    }

    async onMouseEntered(event, index) {
        if(this.onItemMouseEntered != null)
            this.onItemMouseEntered(index);
    }

    async #itemPropertyChanged(owner, propertyName, self) {
        let value = owner[propertyName];
        let index = self.#list.indexOf(owner);
        JBind.setItemFieldValue(self, index, propertyName, value);
    }

    onClicked(event, index) {
        if(this.onItemClicked != null)
            this.onItemClicked(index);
    }

    onSetSelected(index, value) {
        let item = this.#list[index];
        if(value) {
            this.selected.add(item);
            this.lastSelection = index;
        } else {
            this.selected.delete(item);
            this.lastSelection = -1;
        }
        for(let onSelectionChanged of this.onSelectionChanged) {
            onSelectionChanged();
        }
    }

    /**
     * Get the index of the current selected item
     * @returns The selected index
     */
    getSelectedIndex() {
        return this.#list.indexOf(this.selected.values().next().value);
    }

    /**
     * Get the current selected item
     * @returns The current selected item
     */
    getSelectedItem() {
        return this.selected.values().next().value;
    }
    
    /**
     * Get all currently selected items
     * @returns The current selected items
     */
    getSelectedItems() {
        return Array.from(this.selected);
    }

    /**
     * Clear all selected items
     * @param {boolean} update True to propagate to UI, default is true
     */
    clearSelectedItems(update = true) {
        this.selected.clear();
        this.lastSelection = -1;
        if(update) {
            for(let i=0; i<this.#list.length; i++)
                JBind.setItemSelect(this, i, false);
        }
    }

    /**
     * Select an item in the list
     * @param {any} item The item to select
     */
    select(item) {
        let index = this.#list.indexOf(item);
        if(index >= 0) {
            this.selected.add(item);
            JBind.setItemSelect(this, index, true);
            this.lastSelection = index;
        }
    }

    /**
     * Add a listener for when a selection changes
     * @param {function()} onSelectionChanged 
     */
    addSelectedChangeListener(onSelectionChanged) {
        this.onSelectionChanged.push(onSelectionChanged);
    }

    /**
     * Remove a listener for when a selecton changes
     * @param {function()} onSelectionChanged 
     */
    removeSelectedChangeListener(onSelectionChanged) {
        this.onSelectionChanged.remove(onSelectionChanged);
    }


    /**
     * Add an item
     * @param {string|any} value The value of the item as string or {name: name, value: value}
     * @param {function(any,number,any)} oncontextmenu An optional callback for a right click (list, position, value)
     */
    add(value, oncontextmenu) {
        this.#list.push(value);
        if(value instanceof PropertyNotifier)
            value.observePropertyChanges(this.#itemPropertyChanged, this);
        JBind.setItemValue(this, this.#list.length-1, value, oncontextmenu);
    }

    /**
     * Insert an item at specific position
     * @param {number} position The position in the list
     * @param {string|any} value The value of the item as string or {name: name, value: value}
     * @param {function(any,number,any)} oncontextmenu An optional callback for a right click (list, position, value)
     */
    insert(position, value, oncontextmenu) {
        if (this.#list.length < position)
            this.#list = this.#list.concat(new Array(position - this.list.length));
        this.#list.splice(position, 0, value);
        if(value instanceof PropertyNotifier)
            value.observePropertyChanges(this.#itemPropertyChanged, this);
        JBind.setItemValue(this, position, value, oncontextmenu);
    }

    /**
     * Get an item by position in the list
     * @param {number} position The position in the list
     * @returns The item
     */
    get(position) {
        return this.#list[position];
    }

    /**
     * CLear the list
     */
    clear() {
        for(let item of this.#list) {
            if(item instanceof PropertyNotifier)
                item.unobservePropertyChanges(this.#itemPropertyChanged);
        }
        this.selected.clear();
        this.#list.length = 0;
        this.lastSelection = -1;
        JBind.setValue(this, null);
    }

    /**
     * Add a list of values
     * @param {string[]|any[]} values The list of values
     */
    addAll(values) {
        for (let val of values)
            this.add(val);
    }

    /**
     * Remove an item
     * @param {string|any} value 
     */
    remove(value) {
        let index = this.#list.indexOf(value);
        this.removeAt(index);
    }

    /**
     * Remove an item at specific index
     * @param {number} index The index
     */
    removeAt(index) {
        if(index >= 0) {
            let item = this.#list[index]
            this.#list.splice(index, 1);
            this.selected.delete(item);
            JBind.removeItem(this, index)
        }
    }

    /**
     * Get the length of the list
     * @returns The length
     */
    length() {
        return this.#list.length;
    }

    /**
     * Get the last selection
     * @returns The last selection
     */
    getLastSelection() {
        return this.lastSelection;
    }

    /**
     * Bring a item of the list into view
     * @param {number} index The index of the list
     */
    bringIntoView(index) {
        JBind.bringIntoView(this, index);
    }
}