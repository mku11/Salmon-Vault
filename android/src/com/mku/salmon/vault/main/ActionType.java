package com.mku.salmon.vault.main;
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

public enum ActionType {
    BACK, REFRESH, IMPORT, IMPORT_FILES, IMPORT_FOLDER,
    VIEW, VIEW_AS_TEXT, VIEW_EXTERNAL, EDIT, SHARE, SAVE,
    EXPORT, EXPORT_AND_DELETE, DELETE, RENAME, UP, DOWN,
    MULTI_SELECT, SINGLE_SELECT, SELECT_ALL, UNSELECT_ALL,
    COPY, CUT, PASTE,
    NEW_FOLDER, NEW_FILE, SEARCH, STOP, PLAY, SORT,
    OPEN_VAULT, CREATE_VAULT, CLOSE_VAULT, CHANGE_PASSWORD,
    IMPORT_AUTH, EXPORT_AUTH, REVOKE_AUTH, DISPLAY_AUTH_ID,
    VIEW_AUTH_APPS, VIEW_PENDING_AUTH_APPS,
    PROPERTIES, DISK_USAGE, SETTINGS, ABOUT, EXIT
}