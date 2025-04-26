package com.mku.salmon.vault.controller;
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

import com.mku.salmon.vault.dialog.SalmonDialog;
import com.mku.salmon.vault.viewmodel.SalmonFileViewModel;
import javafx.scene.control.Alert;
import javafx.stage.Stage;
import org.icepdf.ri.common.ComponentKeyBinding;
import org.icepdf.ri.common.SwingController;
import org.icepdf.ri.common.SwingViewBuilder;

import javax.swing.*;
import java.io.IOException;
import java.io.InputStream;

public class PDFViewerController {

    public static void openPDFViewer(SalmonFileViewModel file, Stage owner) throws IOException {
        SwingController swingController = new SwingController();
        SwingViewBuilder factory = new SwingViewBuilder(swingController);
        JPanel viewerComponentPanel = factory.buildViewerPanel();
        ComponentKeyBinding.install(swingController, viewerComponentPanel);
        swingController.getDocumentViewController().setAnnotationCallback(
                new org.icepdf.ri.common.MyAnnotationCallback(
                        swingController.getDocumentViewController()));
        JFrame window = new JFrame("PDF Viewer");
        window.getContentPane().add(viewerComponentPanel);
        window.pack();
        window.setVisible(true);
        try {
            InputStream stream = file.getAesFile().getInputStream().asReadStream();
            swingController.openDocument(stream, "Encrypted PDF", file.getAesFile().getName());
        } catch (Exception e) {
            e.printStackTrace();
            new SalmonDialog(Alert.AlertType.ERROR, "Could not load PDF: " + e.getMessage()).show();
        }
    }
}
