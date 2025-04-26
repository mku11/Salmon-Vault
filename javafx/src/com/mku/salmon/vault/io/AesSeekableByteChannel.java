package com.mku.salmon.vault.io;
/*
MIT License

Copyright (c) 2025 Max Kas

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

import com.mku.salmon.streams.AesStream;
import com.mku.salmonfs.file.AesFile;
import org.jcodec.api.NotSupportedException;
import org.jcodec.common.io.SeekableByteChannel;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;

public class AesSeekableByteChannel implements SeekableByteChannel {

    private static final int BUFFER_SIZE = 512 * 1024;
    private final AesFile file;
    private final AesStream stream;
    private final InputStream inputStream;
    private final byte[] buffer;
    private boolean isOpened = false;

    public AesSeekableByteChannel(AesFile file) throws IOException {
        this.file = file;
        this.stream = file.getInputStream();
        this.inputStream = stream.asReadStream();
        this.isOpened = true;
        int bufferSize = BUFFER_SIZE / stream.getAlignSize() * stream.getAlignSize();
        buffer = new byte[bufferSize];
    }

    @Override
    public long position() throws IOException {
        return this.stream.getPosition();
    }

    @Override
    public SeekableByteChannel setPosition(long newPosition) throws IOException {
        if(newPosition < this.stream.getPosition()) {
            this.inputStream.reset();
            this.inputStream.skip(newPosition);
        } else {
            this.inputStream.skip(newPosition - this.stream.getPosition());
        }
        return this;
    }

    @Override
    public long size() throws IOException {
        return this.stream.getLength();
    }

    @Override
    public SeekableByteChannel truncate(long size) throws IOException {
        throw new NotSupportedException("Read only stream");
    }

    @Override
    public int read(ByteBuffer dst) throws IOException {
        int bytesRead = inputStream.read(buffer, 0, Math.min(dst.limit()-dst.position(), buffer.length));
        dst.put(buffer, 0, bytesRead);
        return bytesRead;
    }

    @Override
    public int write(ByteBuffer src) throws IOException {
        throw new NotSupportedException("Read only stream");
    }

    @Override
    public boolean isOpen() {
        return isOpened;
    }

    @Override
    public void close() throws IOException {
        this.stream.close();
        this.isOpened = false;
    }
}
