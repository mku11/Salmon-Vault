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
using Android.Content;
using Android.Widget;
using Google.Android.Material.Dialog;
using Google.Android.Material.TextField;
using Salmon.Vault.Utils;
using System;
using AndroidX.AppCompat.App;
using Android.Views;
using Activity = Android.App.Activity;
using Salmon.Vault.DotNetAndroid;
using Mku.FS.Drive.Utils;
using System.Collections.Generic;
using static Salmon.Vault.Main.SalmonActivity;
using System.Linq;
using static Android.Provider.CalendarContract;

namespace Salmon.Vault.Dialog;

public class SalmonDialog
{
    public static void PromptEdit(string title, string msg, Action<string, bool> OnEdit,
        string value = "", bool isFileName = false, bool readOnly = false, bool isPassword = false,
        string option = null)
    {
        Activity activity = WindowUtils.UiActivity;
        WindowUtils.RunOnMainThread(() =>
        {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

            LinearLayout layout = new LinearLayout(activity);
            layout.SetPadding(20, 20, 20, 20);
            layout.Orientation = Orientation.Vertical;

            TextInputLayout msgText = new TextInputLayout(activity, null,
                Resource.Style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
            msgText.SetPadding(20, 20, 20, 20);
            msgText.BoxBackgroundMode = TextInputLayout.BoxBackgroundOutline;
            msgText.SetBoxCornerRadii(5, 5, 5, 5);
            msgText.Hint = msg;
            View valueText;
            TextInputEditText typePasswd = null;
            if (isPassword)
            {
                TextInputLayout typePasswdText = new TextInputLayout(activity, null,
            Resource.Style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
                typePasswdText.PasswordVisibilityToggleEnabled = true;
                typePasswdText.BoxBackgroundMode = TextInputLayout.BoxBackgroundOutline;
                typePasswdText.SetBoxCornerRadii(5, 5, 5, 5);
                typePasswdText.Hint = msg;

                typePasswd = new TextInputEditText(typePasswdText.Context);
                typePasswd.InputType = Android.Text.InputTypes.TextVariationPassword |
                              Android.Text.InputTypes.ClassText;
                typePasswd.Text = value;
                typePasswdText.AddView(typePasswd);
                valueText = typePasswdText;
            }
            else
            {
                TextInputEditText text = new TextInputEditText(msgText.Context);
                text.Text = value;
                if (readOnly)
                {
                    text.InputType = Android.Text.InputTypes.Null;
                    text.SetTextIsSelectable(true);
                }
                else
                {
                    text.InputType = Android.Text.InputTypes.ClassText;
                }
                bool once = false;
                text.FocusChange += (sender, args) =>
                {
                    if (!once)
                    {
                        if (isFileName)
                        {
                            string ext = FileUtils.GetExtensionFromFileName(value);
                            if (ext != null && ext.Length > 0)
                                text.SetSelection(0, value.Length - ext.Length - 1);
                            else
                                text.SetSelection(0, value.Length);
                        }
                        else
                        {
                            text.SelectAll();
                        }
                        once = true;
                    }
                };
                valueText = text;
            }
            LinearLayout.LayoutParams parameters = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MatchParent, LinearLayout.LayoutParams.MatchParent);
            msgText.AddView(valueText);
            layout.AddView(msgText, parameters);
            CheckBox optionCheckBox = new CheckBox(activity);
            if (option != null)
            {
                optionCheckBox.Text = option;
                layout.AddView(optionCheckBox, parameters);
            }
            builder.SetPositiveButton(activity.GetString(Android.Resource.String.Ok), (object sender, DialogClickEventArgs e) =>
            {
                if (OnEdit != null)
                {
                    if (isPassword)
                        OnEdit(typePasswd.Text.ToString(), optionCheckBox.Checked);
                    else
                        OnEdit((valueText as EditText).Text.ToString(), optionCheckBox.Checked);
                }
            });
            builder.SetNegativeButton(activity.GetString(Android.Resource.String.Cancel), (object sender, DialogClickEventArgs e) =>
            {
                ((AlertDialog)sender).Dismiss();
            });

            AlertDialog alertDialog = builder.Create();
            alertDialog.SetTitle(title);
            alertDialog.SetCancelable(true);
            alertDialog.SetCanceledOnTouchOutside(false);
            alertDialog.SetView(layout);

            valueText.RequestFocus();
            alertDialog.Window.SetSoftInputMode(SoftInput.AdjustResize);
            if (!activity.IsFinishing)
                alertDialog.Show();
        });
    }


    public static void PromptCredentialsEdit(string title, String msg,
                                             string[] hints, String[] values, bool[] isPasswords,
                                             Action<string[]> OnEdit)
    {
        Activity activity = WindowUtils.UiActivity;
        WindowUtils.RunOnMainThread(() =>
        {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

            LinearLayout layout = new LinearLayout(activity);
            layout.SetPadding(20, 20, 20, 20);
            layout.Orientation = Orientation.Vertical;

            LinearLayout.LayoutParams parameters = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MatchParent, LinearLayout.LayoutParams.MatchParent);

            TextView msgText = new TextView(activity);
            msgText.SetPadding(20, 20, 20, 20);
            msgText.Text = msg;
            layout.AddView(msgText, parameters);

            View[] textFields = new View[hints.Length];
            for (int i = 0; i < hints.Length; i++)
            {
                if (hints[i] != null)
                {
                    textFields[i] = CreateTextField(activity, hints[i], values[i], isPasswords[i]);
                    layout.AddView(textFields[i], parameters);
                }
            }

            builder.SetPositiveButton(activity.GetString(Android.Resource.String.Ok), (sender, e) =>
            {
                if (OnEdit != null)
                {
                    String[] texts = new String[hints.Length];
                    for (int i = 0; i < textFields.Length; i++)
                    {
                        if (textFields[i] != null)
                        {
                            EditText editText;
                            if (textFields[i] is TextInputLayout)
                                editText = ((TextInputLayout)textFields[i]).EditText;
                            else
                                editText = (EditText)textFields[i];
                            texts[i] = editText.Text.ToString();
                        }
                    }
                    OnEdit(texts);
                }
            });
            builder.SetNegativeButton(activity.GetString(Android.Resource.String.Cancel), (sender, e) =>
            {
                ((AlertDialog)sender).Dismiss();
            });

            AlertDialog alertDialog = builder.Create();
            alertDialog.SetTitle(title);
            alertDialog.SetCancelable(true);
            alertDialog.SetCanceledOnTouchOutside(false);
            alertDialog.SetView(layout);

            alertDialog.Window.SetSoftInputMode(SoftInput.AdjustResize);
            if (!activity.IsFinishing)
                alertDialog.Show();
        });
    }

    private static View CreateTextField(Activity activity, String hint, String value, bool isPassword)
    {

        View valueText;
        if (!isPassword)
        {
            TextInputEditText text = new TextInputEditText(activity);
            text.InputType = Android.Text.InputTypes.ClassText;
            text.Hint = hint;
            text.Text = value;
            valueText = text;
        }
        else
        {
            TextInputLayout typePasswdText = new TextInputLayout(activity, null,
                    Resource.Style.Widget_MaterialComponents_TextInputLayout_OutlinedBox);
            typePasswdText.PasswordVisibilityToggleEnabled = true;
            typePasswdText.BoxBackgroundMode = TextInputLayout.BoxBackgroundOutline;
            typePasswdText.SetBoxCornerRadii(5, 5, 5, 5);
            typePasswdText.Hint = hint;

            TextInputEditText typePasswd = new TextInputEditText(typePasswdText.Context);
            typePasswd.InputType = Android.Text.InputTypes.TextVariationPassword |
                    Android.Text.InputTypes.ClassText;
            typePasswd.Text = value;
            typePasswdText.AddView(typePasswd);
            valueText = typePasswdText;
        }
        return valueText;
    }

    public static void PromptDialog(string title, string body,
                                        string buttonLabel1 = "Ok", Action buttonListener1 = null,
                                        string buttonLabel2 = null, Action buttonListener2 = null)
    {
        Activity activity = WindowUtils.UiActivity;
        WindowUtils.RunOnMainThread(() =>
        {
            MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);
            if (title != null)
                builder.SetTitle(title);
            builder.SetMessage(body);
            if (buttonLabel1 != null)
                builder.SetPositiveButton(buttonLabel1, (s, e) =>
                {
                    if (buttonListener1 != null)
                        buttonListener1();
                });
            if (buttonLabel2 != null)
                builder.SetNegativeButton(buttonLabel2, (s, e) =>
                {
                    if (buttonListener2 != null)
                        buttonListener2();
                });

            AlertDialog alertDialog = builder.Create();
            alertDialog.SetTitle(title);
            alertDialog.SetCancelable(true);
            alertDialog.SetCanceledOnTouchOutside(false);

            if (!activity.IsFinishing)
                alertDialog.Show();
        });
    }

    public static Action<string> promptUpdatableDialog(string title, string msg)
    {
        Activity activity = WindowUtils.UiActivity;
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);

        LinearLayout layout = new LinearLayout(activity);
        layout.SetPadding(20, 20, 20, 20);
        TextView textView = new TextView(activity);
        textView.SetPadding(20, 20, 20, 20);
        textView.Text = msg;
        layout.AddView(textView);
        builder.SetPositiveButton(Android.Resource.String.Ok, (sender, e) => { });

        AlertDialog alertDialog = builder.Create();
        alertDialog.SetTitle(title);
        alertDialog.SetCancelable(true);
        alertDialog.SetCanceledOnTouchOutside(false);
        alertDialog.SetView(layout);
        if (!activity.IsFinishing)
            alertDialog.Show();
        return (body) => WindowUtils.RunOnMainThread(() => textView.Text = body);
    }

    public static void PromptSingleValue(string title, IList<string> items,
                                         int currSelection, Action<int> onClickListener)
    {
        Activity activity = WindowUtils.UiActivity;
        ArrayAdapter<string> adapter = new ArrayAdapter<string>(
                activity, Android.Resource.Layout.SimpleListItemActivated1, items.ToArray());
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(activity);
        if (title != null)
            builder.SetTitle(title);
        builder.SetSingleChoiceItems(adapter, currSelection, (object sender, DialogClickEventArgs e) =>
        {
            ((AlertDialog)sender).Dismiss();
            onClickListener(e.Which);
        });
        AlertDialog alertDialog = builder.Create();
        alertDialog.SetTitle(title);
        alertDialog.SetCancelable(true);
        alertDialog.SetCanceledOnTouchOutside(false);
        if (!activity.IsFinishing)
            alertDialog.Show();
    }

    public static void PromptDialog(string body)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            PromptDialog("", body, "Ok");
        });
    }
}