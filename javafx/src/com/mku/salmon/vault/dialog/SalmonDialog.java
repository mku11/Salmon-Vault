package com.mku.salmon.vault.dialog;
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

import com.mku.fs.drive.utils.FileUtils;
import com.mku.func.BiConsumer;
import com.mku.func.Consumer;
import com.mku.salmon.vault.utils.WindowUtils;
import javafx.event.ActionEvent;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class SalmonDialog extends javafx.scene.control.Alert {
    private static String defaultStyleSheet;

    public SalmonDialog(AlertType alertType, String content) {
        super(alertType, content);
        setupIcon();
        setupStyle();
    }

    public static void setDefaultStyleSheet(String defaultStyleSheet) {
        SalmonDialog.defaultStyleSheet = defaultStyleSheet;
    }

    private void setupIcon() {
        Image icon = WindowUtils.getDefaultIcon();
        Stage dialogStage = (Stage) getDialogPane().getScene().getWindow();
        dialogStage.getIcons().add(icon);
    }

    public SalmonDialog(AlertType confirmation, String content, ButtonType buttonTypeOk, ButtonType buttonTypeCancel) {
        super(confirmation, content, buttonTypeOk, buttonTypeCancel);
        setupIcon();
        setupStyle();
    }

    public SalmonDialog(AlertType confirmation, String content, ButtonType buttonTypeOk) {
        super(confirmation, content, buttonTypeOk);
        setupIcon();
        setupStyle();
    }

    public SalmonDialog(AlertType confirmation, String content, ButtonType buttonType1, ButtonType buttonType2, ButtonType buttonType3) {
        super(confirmation, content, buttonType1, buttonType2, buttonType3);
        setupIcon();
        setupStyle();
    }

    private void setupStyle() {
        Stage dialogStage = (Stage) getDialogPane().getScene().getWindow();
        Scene scene = dialogStage.getScene();
        scene.getStylesheets().add(defaultStyleSheet);
        getDialogPane().setMinHeight(Region.USE_PREF_SIZE);
    }

    public static void promptEdit(String title, String msg, BiConsumer<String, Boolean> OnEdit,
                                  String value, boolean isFileName, boolean readOnly, boolean isPassword, String option) {
        WindowUtils.runOnMainThread(() -> {
            SalmonDialog alert = new SalmonDialog(Alert.AlertType.NONE, "", ButtonType.OK, ButtonType.CANCEL);
            alert.setTitle(title);
            Label msgText = new Label();
            msgText.setText(msg);
            TextField valueText;
            if (isPassword) {
                PasswordField passText = new PasswordField();
                passText.setAlignment(Pos.CENTER_LEFT);
                passText.setText(value);
                valueText = passText;
            } else {
                TextField text = new TextField();
                text.setText(value);
                if (readOnly)
                    text.setEditable(false);
                valueText = text;
            }
            CheckBox optionCheckBox = new CheckBox();
            VBox box = new VBox();
            box.setSpacing(10);
            box.getChildren().addAll(msgText, valueText);
            if (option != null) {
                optionCheckBox.setText(option);
                box.getChildren().add(optionCheckBox);
            }
            alert.getDialogPane().setContent(box);
            alert.getDialogPane().setMinSize(340, 150);
            alert.show();
            alert.getDialogPane().autosize();
            final Button btOk = (Button) alert.getDialogPane().lookupButton(ButtonType.OK);
            valueText.requestFocus();
            if (isFileName) {
                String ext = FileUtils.getExtensionFromFileName(value);
                if (ext != null && ext.length() > 0)
                    valueText.selectRange(0, value.length() - ext.length() - 1);
                else
                    valueText.selectRange(0, value.length());
            } else {
                valueText.selectAll();
            }
            btOk.addEventFilter(ActionEvent.ACTION, event -> {
                        if (OnEdit != null)
                            OnEdit.accept(valueText.getText(), optionCheckBox.isSelected());
                    }
            );
        });
    }

    public static void promptCredentialsEdit(String title, String msg,
                                             String[] hints, String[] values, boolean[] isPasswords,
                                             Consumer<String[]> OnEdit) {
        WindowUtils.runOnMainThread(() -> {
            SalmonDialog alert = new SalmonDialog(Alert.AlertType.NONE, "", ButtonType.OK, ButtonType.CANCEL);
            alert.setTitle(title);

            Label msgText = new Label();
            msgText.setText(msg);

            VBox box = new VBox();
            box.setSpacing(10);
            box.getChildren().addAll(msgText);

            TextField[] textFields = new TextField[hints.length];
            for (int i = 0; i < hints.length; i++) {
                if (hints[i] != null) {
                    textFields[i] = createTextField(hints[i], values[i], isPasswords[i]);
                    box.getChildren().add(textFields[i]);
                }
            }

            alert.getDialogPane().setContent(box);
            alert.getDialogPane().setMinSize(340, 150);
            alert.show();
            alert.getDialogPane().autosize();
            final Button btOk = (Button) alert.getDialogPane().lookupButton(ButtonType.OK);

            btOk.addEventFilter(ActionEvent.ACTION, event -> {
                        if (OnEdit != null) {
                            String[] texts = new String[hints.length];
                            for (int i = 0; i < textFields.length; i++) {
                                if (textFields[i] != null)
                                    texts[i] = textFields[i].getText();
                            }
                            OnEdit.accept(texts);
                        }
                    }
            );
        });
    }

    private static TextField createTextField(String hint, String value, boolean isPassword) {
        if (!isPassword) {
            TextField field = new TextField();
            field.setPromptText(hint);
            field.setText(value);
            return field;
        } else {
            PasswordField passwordField = new PasswordField();
            passwordField.setPromptText(hint);
            passwordField.setText(value);
            return passwordField;
        }
    }

    public static void promptDialog(String body) {
        promptDialog("Salmon Vault", body, "Ok", null, null, null);
    }

    public static void promptDialog(String title, String body) {
        promptDialog(title, body, "Ok", null, null, null);
    }

    public static void promptDialog(String title, String body, String buttonLabel) {
        promptDialog(title, body, buttonLabel, null, null, null);
    }

    public static void promptDialog(String title, String body,
                                    String buttonLabel1, Runnable buttonListener1,
                                    String buttonLabel2, Runnable buttonListener2) {
        promptDialog(title, body, buttonLabel1, buttonListener1, buttonLabel2, buttonListener2,
                null, null);
    }

    public static void promptDialog(String title, String body,
                                    String buttonLabel1, Runnable buttonListener1,
                                    String buttonLabel2, Runnable buttonListener2,
                                    String buttonLabel3, Runnable buttonListener3) {
        WindowUtils.runOnMainThread(() -> {
            ButtonType ok = new ButtonType(buttonLabel1, ButtonBar.ButtonData.OK_DONE);

            ButtonType cancel = new ButtonType(buttonLabel2, ButtonBar.ButtonData.CANCEL_CLOSE);
            ButtonType apply = new ButtonType(buttonLabel3, ButtonBar.ButtonData.APPLY);
            SalmonDialog alert;

            if (buttonLabel3 != null)
                alert = new SalmonDialog(javafx.scene.control.Alert.AlertType.NONE, body, ok, cancel, apply);
            else if (buttonLabel2 != null)
                alert = new SalmonDialog(javafx.scene.control.Alert.AlertType.NONE, body, ok, cancel);
            else
                alert = new SalmonDialog(javafx.scene.control.Alert.AlertType.NONE, body, ok);

            if (title != null)
                alert.setTitle(title);
            alert.setContentText(body);
            Optional<ButtonType> result = alert.showAndWait();
            if (result.isPresent() && result.get() == ok && buttonListener1 != null) {
                buttonListener1.run();
            } else if (result.isPresent() && result.get() == cancel && buttonListener2 != null) {
                buttonListener2.run();
            } else if (result.isPresent() && result.get() == apply && buttonListener3 != null) {
                buttonListener3.run();
            }
        });
    }

    public static Consumer<String> promptUpdatableDialog(String title, String msg) {
        SalmonDialog alert = new SalmonDialog(Alert.AlertType.NONE, "", ButtonType.OK, ButtonType.CANCEL);
        alert.setTitle(title);
        Label msgText = new Label();
        msgText.setText(msg);
        VBox box = new VBox();
        box.setSpacing(10);
        box.getChildren().addAll(msgText);

        alert.getDialogPane().setContent(box);
        alert.getDialogPane().setMinSize(340, 150);
        alert.show();
        alert.getDialogPane().autosize();
        return (body) -> WindowUtils.runOnMainThread(() -> msgText.setText(body));
    }


    public static void promptSingleValue(String title, List<String> items,
                                         int currSelection, Consumer<Integer> onClickListener) {
        SalmonDialog alert = new SalmonDialog(Alert.AlertType.NONE, "", ButtonType.OK, ButtonType.CANCEL);
        alert.setTitle(title);

        ToggleGroup toggleGroup = new ToggleGroup();
        List<RadioButton> buttons = new ArrayList<>();
        int index = 0;
        for(String item : items) {
            RadioButton radioButton = new RadioButton(item);
            radioButton.setToggleGroup(toggleGroup);
            buttons.add(radioButton);
            if(currSelection == index)
                radioButton.setSelected(true);
            index++;
        }

        VBox box = new VBox();
        box.setSpacing(10);
        box.getChildren().addAll(buttons);

        alert.getDialogPane().setContent(box);
        alert.getDialogPane().setMinSize(340, 150);
        alert.show();
        alert.getDialogPane().autosize();
        final Button btOk = (Button) alert.getDialogPane().lookupButton(ButtonType.OK);
        btOk.addEventFilter(ActionEvent.ACTION, event -> {
            RadioButton button = (RadioButton) toggleGroup.getSelectedToggle();
            alert.hide();
            onClickListener.accept(buttons.indexOf(button));
        });
    }
}
