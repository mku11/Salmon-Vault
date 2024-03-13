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

import { IPropertyNotifier } from "../../common/binding/iproperty_notifier.js";
import { SalmonFileUtils } from "../../lib/salmon-fs/utils/salmon_file_utils.js";
import { ByteUtils } from "../../common/utils/byte_utils.js";
import { Thumbnails } from "../image/thumbnails.js";

export class SalmonFileViewModel extends IPropertyNotifier {
    static #IMAGE_SIZE = 48;

    // static formatter = new SimpleDateFormat("dd/MM/yyyy hh:mm:ss a");
    salmonFile;
    observers = {};
    getObservers() {
        return this.observers;
    }

    constructor(salmonFile) {
        super();
        this.salmonFile = salmonFile;
    }

    #_image = null;
    get image() {
        if (this.#_image == null) {
            let img = new Image();
            img.width = SalmonFileViewModel.#IMAGE_SIZE;
            img.height = SalmonFileViewModel.#IMAGE_SIZE;
            setTimeout(async () => {
                this.image = await Thumbnails.getIcon(this.salmonFile, SalmonFileViewModel.#IMAGE_SIZE, SalmonFileViewModel.#IMAGE_SIZE);
                this.image = await Thumbnails.generateThumbnail(this.salmonFile, SalmonFileViewModel.#IMAGE_SIZE, SalmonFileViewModel.#IMAGE_SIZE);
            });
        }
        return this.#_image;
    }
    set image(value) {
        if (value != null) {
            this.#_image = value;
            this.propertyChanged(this, "image");
        }
    }

    #_name = null;
    get name() {
        if (this.#_name == null) {
            setTimeout(async () => {
                this.name = await this.salmonFile.getBaseName();
            });
        }
        return this.#_name;
    }
    set name(value) {
        if (value != null) {
            this.#_name = value;
            this.propertyChanged(this, "name");
        }
    }

    #_date = null;
    get date() {
        if (this.#_date == null) {
            setTimeout(async () => {
                this.date = await this.getDateText();
            });
        }
        return this.#_date;
    }
    set date(value) {
        if (value != null) {
            this.#_date = value;
            this.propertyChanged(this, "date");
        }
    }

    #_type = null;
    get type() {
        if (this.#_type == null) {
            setTimeout(async () => {
                this.type = await this.getExtText();
            });
        }
        return this.#_type;
    }
    set type(value) {
        if (value != null) {
            this.#_type = value;
            this.propertyChanged(this, "type");
        }
    }

    #_size = null;
    get size() {
        if (this.#_type == null) {
            setTimeout(async () => {
                this.size = await this.getSizeText();
            });
        }
        return this.#_size;
    }
    set size(value) {
        if (value != null) {
            this.#_size = value;
            this.propertyChanged(this, "size");
        }
    }

    #_path;
    async path() {
        if (this.#_path == null) {
            setTimeout(async () => {
                this.path = await this.salmonFile.getPath();
            });
        }
        return this.#_path;
    }
    set path(value) {
        if (value != null) {
            this.#_path = value;
            this.propertyChanged(this, "path");
        }
    }

    setSalmonFile(file) {
        salmonFile = file;
        this.update();
    }

    async update() {
        try {
            this.name = await this.salmonFile.getBaseName();
            this.date = await this.getDateText();
            this.size = await this.getSizeText();
            this.type = await this.getExtText();
            this.path = await this.salmonFile.getPath();
        } catch (ex) {
            console.error(ex);
        }
    }

    async getExtText() {
        return SalmonFileUtils.getExtensionFromFileName(await this.salmonFile.getBaseName()).toLowerCase();
    }

    async getDateText() {
        let date = new Date(await this.salmonFile.getLastDateTimeModified());
        return date.getMonth().toString().padStart(2,"0") 
            + "/" + date.getDay().toString().padStart(2,"0") 
            + "/" + date.getFullYear()
            + " " + date.getHours()
            + ":" + date.getMinutes()
            + ":" + date.getSeconds()
            ;
    }

    async getSizeText() {
        if (!await this.salmonFile.isDirectory())
            return ByteUtils.getBytes(await (this.salmonFile.getRealFile()).length(), 2);
        else {
            let items = await this.salmonFile.getChildrenCount();
            return items + " item" + (items == 1 ? "" : "s");
        }
    }

    getSalmonFile() {
        return this.salmonFile;
    }

    async rename(newValue) {
        await this.salmonFile.rename(newValue);
        this.name = await this.salmonFile.getBaseName();
    }
}
