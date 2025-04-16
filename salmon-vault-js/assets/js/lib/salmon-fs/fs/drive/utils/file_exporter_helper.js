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
 * Progress Callback
 *
 * @callback OnFileExportProgressChanged
 * @param {number} position The current position
 * @param {number} length The total length
 */
/**
 * Export a file part from the drive. Do not use this directly, use FileExporter instead.
 *
 * @param {IVirtualFile} fileToExport      The file the part belongs to
 * @param {IFile} exportFile        The file to copy the exported part to
 * @param {number} start             The start position on the file
 * @param {number} count             The length of the bytes to be decrypted
 * @param {number[]} totalBytesWritten The total bytes that were written to the external file
 * @param {OnFileExportProgressChanged} onProgressChanged The file progress
 */
export async function exportFilePart(fileToExport, exportFile, start, count, totalBytesWritten, onProgressChanged, bufferSize, stopped) {
    let totalPartBytesWritten = 0;
    let targetStream = null;
    let sourceStream = null;
    try {
        targetStream = await exportFile.getOutputStream();
        await targetStream.setPosition(start);
        sourceStream = await fileToExport.getInputStream();
        await sourceStream.setPosition(start);
        let nBufferSize = Math.floor(bufferSize / sourceStream.getAlignSize()) * sourceStream.getAlignSize();
        let bytes = new Uint8Array(nBufferSize);
        let bytesRead;
        while ((bytesRead = await sourceStream.read(bytes, 0, Math.min(bytes.length, (count - totalPartBytesWritten)))) > 0 && totalPartBytesWritten < count) {
            if (stopped[0])
                break;
            await targetStream.write(bytes, 0, bytesRead);
            totalPartBytesWritten += bytesRead;
            totalBytesWritten[0] += bytesRead;
            if (onProgressChanged)
                onProgressChanged(totalBytesWritten[0], count);
        }
    }
    catch (ex) {
        console.error(ex);
        throw ex;
    }
    finally {
        if (targetStream) {
            await targetStream.flush();
            await targetStream.close();
        }
        if (sourceStream) {
            await sourceStream.close();
        }
    }
}
