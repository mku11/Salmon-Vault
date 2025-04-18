package com.mku.salmon.vault.dialog;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.text.InputType;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.mku.fs.drive.utils.FileUtils;
import com.mku.func.Consumer;
import com.mku.salmon.vault.android.R;
import com.mku.salmon.vault.utils.WindowUtils;

import com.mku.func.BiConsumer;

import java.util.TreeMap;

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
public class SalmonDialog {
    public static void promptEdit(String title, String msg, BiConsumer<String, Boolean> OnEdit,
                                  String value, boolean isFileName, boolean readOnly, boolean isPassword,
                                  String option) {
        Activity activity = WindowUtils.getUiActivity();
        WindowUtils.runOnMainThread(() ->
        {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

            LinearLayout layout = new LinearLayout(activity);
            layout.setPadding(20, 20, 20, 20);
            layout.setOrientation(LinearLayout.VERTICAL);

            TextInputLayout msgText = new TextInputLayout(activity, null,
                    R.style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
            msgText.setPadding(20, 20, 20, 20);
            msgText.setBoxBackgroundMode(TextInputLayout.BOX_BACKGROUND_OUTLINE);
            msgText.setBoxCornerRadii(5, 5, 5, 5);
            msgText.setHint(msg);
            View valueText;
            TextInputEditText typePasswd = null;
            if (isPassword) {
                TextInputLayout typePasswdText = new TextInputLayout(activity, null,
                        R.style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
                typePasswdText.setPasswordVisibilityToggleEnabled(true);
                typePasswdText.setBoxBackgroundMode(TextInputLayout.BOX_BACKGROUND_OUTLINE);
                typePasswdText.setBoxCornerRadii(5, 5, 5, 5);
                typePasswdText.setHint(msg);

                typePasswd = new TextInputEditText(typePasswdText.getContext());
                typePasswd.setInputType(InputType.TYPE_TEXT_VARIATION_PASSWORD |
                        InputType.TYPE_CLASS_TEXT);
                typePasswd.setText(value);
                typePasswdText.addView(typePasswd);
                valueText = typePasswdText;
            } else {
                TextInputEditText text = new TextInputEditText(msgText.getContext());
                text.setText(value);
                if (readOnly) {
                    text.setInputType(InputType.TYPE_NULL);
                    text.setTextIsSelectable(true);
                } else {
                    text.setInputType(InputType.TYPE_CLASS_TEXT);
                }
                text.setOnFocusChangeListener(new View.OnFocusChangeListener() {
                    boolean once = false;

                    @Override
                    public void onFocusChange(View view, boolean b) {
                        if (!once) {
                            if (isFileName) {
                                String ext = FileUtils.getExtensionFromFileName(value);
                                if (ext != null && ext.length() > 0)
                                    text.setSelection(0, value.length() - ext.length() - 1);
                                else
                                    text.setSelection(0, value.length());
                            } else {
                                text.selectAll();
                            }
                            once = true;
                        }
                    }
                });
                valueText = text;
            }
            LinearLayout.LayoutParams parameters = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT);
            msgText.addView(valueText);
            layout.addView(msgText, parameters);
            CheckBox optionCheckBox = new CheckBox(activity);
            if (option != null) {
                optionCheckBox.setText(option);
                layout.addView(optionCheckBox, parameters);
            }
            TextInputEditText finalTypePasswd = typePasswd;
            builder.setPositiveButton(activity.getString(android.R.string.ok), (sender, e) ->
            {
                if (OnEdit != null) {
                    if (isPassword)
                        OnEdit.accept(finalTypePasswd.getText().toString(), optionCheckBox.isChecked());
                    else
                        OnEdit.accept(((EditText) valueText).getText().toString(), optionCheckBox.isChecked());
                }
            });
            builder.setNegativeButton(activity.getString(android.R.string.cancel), (sender, e) ->
            {
                ((AlertDialog) sender).dismiss();
            });

            AlertDialog alertDialog = builder.create();
            alertDialog.setTitle(title);
            alertDialog.setCancelable(true);
            alertDialog.setCanceledOnTouchOutside(false);
            alertDialog.setView(layout);

            valueText.requestFocus();
            alertDialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            if (!activity.isFinishing())
                alertDialog.show();

        });
    }


    public static void promptCredentialsEdit(String title, String msg,
                                             String[] hints, String[] values, boolean[] isPasswords,
                                             Consumer<String[]> OnEdit) {
        Activity activity = WindowUtils.getUiActivity();
        WindowUtils.runOnMainThread(() -> {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

            LinearLayout layout = new LinearLayout(activity);
            layout.setPadding(20, 20, 20, 20);
            layout.setOrientation(LinearLayout.VERTICAL);

            LinearLayout.LayoutParams parameters = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT);

            TextView msgText = new TextView(activity);
            msgText.setPadding(20, 20, 20, 20);
            msgText.setText(msg);
            layout.addView(msgText, parameters);

            View[] textFields = new View[hints.length];
            for (int i = 0; i < hints.length; i++) {
                if (hints[i] != null) {
                    textFields[i] = createTextField(activity, hints[i], values[i], isPasswords[i]);
                    layout.addView(textFields[i], parameters);
                }
            }

            builder.setPositiveButton(activity.getString(android.R.string.ok), (sender, e) ->
            {
                if (OnEdit != null) {
                    String[] texts = new String[hints.length];
                    for (int i = 0; i < textFields.length; i++) {
                        if (textFields[i] != null) {
                            EditText editText;
                            if(textFields[i] instanceof TextInputLayout)
                                editText = ((TextInputLayout) textFields[i]).getEditText();
                            else
                                editText = (EditText) textFields[i];
                            texts[i] = editText.getText().toString();
                        }
                    }
                    OnEdit.accept(texts);
                }
            });
            builder.setNegativeButton(activity.getString(android.R.string.cancel), (sender, e) ->
            {
                sender.dismiss();
            });

            AlertDialog alertDialog = builder.create();
            alertDialog.setTitle(title);
            alertDialog.setCancelable(true);
            alertDialog.setCanceledOnTouchOutside(false);
            alertDialog.setView(layout);

            alertDialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            if (!activity.isFinishing())
                alertDialog.show();
        });
    }

    private static View createTextField(Activity activity, String hint, String value, boolean isPassword) {

        View valueText;
        if(!isPassword) {
            TextInputEditText text = new TextInputEditText(activity);
            text.setInputType(InputType.TYPE_CLASS_TEXT);
            text.setHint(hint);
            text.setText(value);
            valueText = text;
        } else {
            TextInputLayout typePasswdText = new TextInputLayout(activity, null,
                    R.style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
            typePasswdText.setPasswordVisibilityToggleEnabled(true);
            typePasswdText.setBoxBackgroundMode(TextInputLayout.BOX_BACKGROUND_OUTLINE);
            typePasswdText.setBoxCornerRadii(5, 5, 5, 5);
            typePasswdText.setHint(hint);

            TextInputEditText typePasswd = new TextInputEditText(typePasswdText.getContext());
            typePasswd.setInputType(InputType.TYPE_TEXT_VARIATION_PASSWORD |
                    InputType.TYPE_CLASS_TEXT);
            typePasswd.setText(value);
            typePasswdText.addView(typePasswd);
            valueText = typePasswdText;
        }
        return valueText;
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
        if (buttonLabel1 == null)
            buttonLabel1 = "Ok";
        Activity activity = WindowUtils.getUiActivity();
        String finalButtonLabel = buttonLabel1;
        WindowUtils.runOnMainThread(() ->
        {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);
            if (title != null)
                builder.setTitle(title);
            builder.setMessage(body);
            if (finalButtonLabel != null)
                builder.setPositiveButton(finalButtonLabel, (s, e) ->
                {
                    if (buttonListener1 != null)
                        buttonListener1.run();
                });
            if (buttonLabel2 != null)
                builder.setNegativeButton(buttonLabel2, (s, e) ->
                {
                    if (buttonListener2 != null)
                        buttonListener2.run();
                });
            if (buttonLabel3 != null)
                builder.setNeutralButton(buttonLabel3, (s, e) ->
                {
                    if (buttonListener3 != null)
                        buttonListener3.run();
                });

            AlertDialog alertDialog = builder.create();
            alertDialog.setTitle(title);
            alertDialog.setCancelable(true);
            alertDialog.setCanceledOnTouchOutside(false);

            if (!activity.isFinishing())
                alertDialog.show();
        });
    }

    public static Consumer<String> promptUpdatableDialog(String title, String msg) {
        Activity activity = WindowUtils.getUiActivity();
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

        LinearLayout layout = new LinearLayout(activity);
        layout.setPadding(20, 20, 20, 20);
        TextView textView = new TextView(activity);
        textView.setPadding(20, 20, 20, 20);
		textView.setText(msg);
        layout.addView(textView);
        builder.setPositiveButton(android.R.string.ok, null);

        AlertDialog alertDialog = builder.create();
        alertDialog.setTitle(title);
        alertDialog.setCancelable(true);
        alertDialog.setCanceledOnTouchOutside(false);
        alertDialog.setView(layout);
        if (!activity.isFinishing())
            alertDialog.show();
        return (body) -> WindowUtils.runOnMainThread(() -> textView.setText(body));
    }

    public static void promptSingleValue(ArrayAdapter<String> adapter, String title,
                                         int currSelection, BiConsumer<AlertDialog, Integer> onClickListener) {
        Activity activity = WindowUtils.getUiActivity();
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);
        if (title != null)
            builder.setTitle(title);
        builder.setSingleChoiceItems(adapter, currSelection, (sender, which) ->
        {
            onClickListener.accept((AlertDialog) sender, which);
        });
        AlertDialog alertDialog = builder.create();
        alertDialog.setTitle(title);
        alertDialog.setCancelable(true);
        alertDialog.setCanceledOnTouchOutside(false);

        if (!activity.isFinishing())
            alertDialog.show();
    }

    public static void promptDialog(String body) {
        promptDialog("", body, null, null, null, null);
    }

    public static void promptDialog(String title, String body) {
        promptDialog(title, body, null, null, null, null);
    }

    public static void promptDialog(String title, String body, String buttonLabel) {
        promptDialog(title, body, buttonLabel, null, null, null);
    }
}