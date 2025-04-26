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
import com.mku.salmon.vault.utils.FileTypes;
import com.mku.salmon.vault.utils.WindowUtils;
import com.mku.salmon.vault.viewmodel.SalmonFileViewModel;
import com.mku.salmonfs.file.AesFile;
import javafx.embed.swing.SwingFXUtils;
import javafx.scene.control.Alert;
import javafx.stage.Stage;
import org.docx4j.Docx4J;
import org.docx4j.convert.out.FOSettings;
import org.docx4j.fonts.BestMatchingMapper;
import org.docx4j.fonts.IdentityPlusMapper;
import org.docx4j.fonts.Mapper;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.icepdf.ri.common.ComponentKeyBinding;
import org.icepdf.ri.common.SwingController;
import org.icepdf.ri.common.SwingViewBuilder;

import javax.swing.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class PDFViewerController {

    private static final boolean useFacade = false;

    public static void openPDFViewer(SalmonFileViewModel file, Stage owner) throws IOException {
        SwingController swingController = new SwingController();
        SwingViewBuilder factory = new SwingViewBuilder(swingController);
        JPanel viewerComponentPanel = factory.buildViewerPanel();
        ComponentKeyBinding.install(swingController, viewerComponentPanel);
        swingController.getDocumentViewController().setAnnotationCallback(
                new org.icepdf.ri.common.MyAnnotationCallback(
                        swingController.getDocumentViewController()));
        String title = getTitle(file);
        JFrame window = new JFrame(title);
        window.getContentPane().add(viewerComponentPanel);
        window.pack();
        window.setVisible(true);
        window.setIconImage(SwingFXUtils.fromFXImage(WindowUtils.getDefaultIcon(), null));

        try {
            InputStream stream = getStream(file);
            swingController.openDocument(stream, "Encrypted", file.getAesFile().getName());
        } catch (Exception e) {
            e.printStackTrace();
            new SalmonDialog(Alert.AlertType.ERROR, "Could not load PDF: " + e.getMessage()).show();
        }
    }

    private static InputStream getStream(SalmonFileViewModel file) throws Exception {
        String filename = file.getAesFile().getName();
        InputStream stream;
        if (FileTypes.isPDF(filename)) {
            stream = file.getAesFile().getInputStream().asReadStream();
        } else {
            stream = convert(file.getAesFile());
        }
        return stream;
    }

    private static String getTitle(SalmonFileViewModel file) throws IOException {
        String title = "PDF Viewer";
        String filename = file.getAesFile().getName();
        if (FileTypes.isDocument(filename)) {
            title = "Document Viewer";
        }
        return title;
    }

    public static InputStream convert(AesFile aesFile) throws Exception {
        WordprocessingMLPackage opcPackage = getPackage(aesFile);
        String os = System.getProperty("os.name").toUpperCase();
        Mapper fontMapper;
        if (os.startsWith("WINDOWS")) {
            fontMapper = new IdentityPlusMapper();
        } else {
            fontMapper = new BestMatchingMapper();
        }
        opcPackage.setFontMapper(fontMapper);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        if (useFacade) {
            Docx4J.toPDF(opcPackage, outputStream);
        } else {
            FOSettings foSettings = Docx4J.createFOSettings();
            foSettings.setOpcPackage(opcPackage);
            int flags = Docx4J.FLAG_EXPORT_PREFER_NONXSL;
            Docx4J.toFO(foSettings, outputStream, flags);
        }
        InputStream stream = new ByteArrayInputStream(outputStream.toByteArray());
        return stream;
    }

    private static WordprocessingMLPackage getPackage(AesFile aesFile) throws Exception {
        InputStream inputStream = aesFile.getInputStream().asReadStream();
        return WordprocessingMLPackage.load(inputStream);
    }
}
