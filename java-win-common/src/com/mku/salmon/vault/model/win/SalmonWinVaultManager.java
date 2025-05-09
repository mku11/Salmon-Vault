package com.mku.salmon.vault.model.win;
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

import com.mku.fs.file.File;
import com.mku.fs.file.IFile;
import com.mku.salmon.sequence.SequenceException;
import com.mku.salmon.sequence.SequenceSerializer;
import com.mku.salmon.vault.config.SalmonConfig;
import com.mku.salmon.vault.model.SalmonVaultManager;
import com.mku.salmon.vault.model.SalmonSettings;
import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.dialog.SalmonDialogs;
import com.mku.win.salmon.sequencer.WinClientSequencer;
import com.mku.win.salmon.sequencer.WinFileSequencer;
import com.mku.win.salmon.sequencer.WinSequenceTamperedException;


import java.io.IOException;

public class SalmonWinVaultManager extends SalmonVaultManager {
    synchronized
    public static SalmonWinVaultManager getInstance() {
        if (instance == null) {
            instance = new SalmonWinVaultManager();
        }
        return (SalmonWinVaultManager) instance;
    }

    protected void setupWinFileSequencer() throws IOException {
        IFile dirFile = new File(getSequencerDefaultDirPath());
        if (!dirFile.exists())
            dirFile.mkdir();
        IFile seqFile = new File(getSequencerFilepath());
        WinFileSequencer sequencer = new WinFileSequencer(seqFile, new SequenceSerializer(), SalmonConfig.REGISTRY_CHKSUM_KEY);
        setSequencer(sequencer);
    }

    protected void setupClientSequencer() {
        try {
            WinClientSequencer sequencer = new WinClientSequencer(SERVICE_PIPE_NAME);
            setSequencer(sequencer);
        } catch (Exception ex) {
            SalmonDialog.promptDialog("Error", "Error during service lookup. Make sure the Salmon Service is installed and running:\n" + ex.getMessage());
        }
    }

    @Override
    public boolean handleException(Exception exception) {
        if (exception instanceof WinSequenceTamperedException
                || (exception.getCause() != null
                && exception.getCause() instanceof WinSequenceTamperedException)) {
            SalmonDialogs.promptSequenceReset(this::resetSequencer);
            return true;
        }
        return false;
    }

    @Override
    public void handleThrowException(Exception ex) {
        if (ex instanceof WinSequenceTamperedException)
            throw new RuntimeException(ex);
    }

    public void resetSequencer(boolean clearChecksumOnly) {
        if (getSequencer() instanceof WinFileSequencer) {
            try {
                ((WinFileSequencer) getSequencer()).reset(clearChecksumOnly);
            } catch (SequenceException e) {
                SalmonDialog.promptDialog("Could not reset sequencer: " + e);
            }
        }
        setupSalmonManager();
    }

    @Override
    public void setupSalmonManager() {
        try {
            if (getSequencer() != null)
                getSequencer().close();

            if (SalmonSettings.getInstance().getSequencerAuthType() == SalmonSettings.AuthType.User) {
                // for windows we have a registry checksum variant
                setupWinFileSequencer();
            } else if (SalmonSettings.getInstance().getSequencerAuthType() == SalmonSettings.AuthType.Service) {
                // or the service
                setupClientSequencer();
            }
        } catch (Exception e) {
            e.printStackTrace();
            SalmonDialog.promptDialog("Error", "Error during initializing: " + e.getMessage());
        }
    }
}