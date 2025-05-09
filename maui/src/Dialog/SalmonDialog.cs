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
using Microsoft.Maui.Controls;
using Salmon.Vault.MAUI;
using Salmon.Vault.Utils;
using System;
using System.Collections.Generic;

namespace Salmon.Vault.Dialog;

public class SalmonDialog
{
    public static void PromptEdit(string title, string msg, Action<string, bool> OnEdit,
        string value = "", bool isFileName = false, bool readOnly = false, bool isPassword = false,
        string option = null)
    {
        WindowUtils.RunOnMainThread(async () =>
        {
            string res = await AppShell.Current.DisplayPromptAsync(title, msg, "Ok", null, null, -1, null, value);
            if (res != null && OnEdit != null)
                OnEdit(res, false);
        });
    }



    public static void PromptCredentialsEdit(string title, String msg,
                                             string[] hints, String[] values, bool[] isPasswords,
                                             Action<string[]> OnEdit)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            //SalmonDialog alert = new SalmonDialog("", ButtonType.Ok, ButtonType.Cancel);
            //alert.Title = title;

            //Label msgText = new Label();
            //msgText.Content = msg;

            //StackPanel panel = new StackPanel();
            //panel.Margin = new Thickness(10);
            //panel.Children.Add(msgText);

            //Control[] textFields = new Control[hints.Length];
            //for (int i = 0; i < hints.Length; i++)
            //{
            //    if (hints[i] != null)
            //    {
            //        textFields[i] = CreateTextField(hints[i], values[i], isPasswords[i]);
            //        panel.Children.Add(textFields[i]);
            //    }
            //}

            //alert.Content = panel;
            //alert.MinWidth = 280;
            //alert.MinHeight = 150;
            //Button btOk = alert.GetButton(ButtonType.Ok);
            //btOk.Click += (sender, e) =>
            //{
            //    if (OnEdit != null)
            //    {
            //        string[] texts = new string[hints.Length];
            //        for (int i = 0; i < textFields.Length; i++)
            //        {
            //            if (textFields[i] != null)
            //            {
            //                texts[i] = textFields[i] is PasswordBox ?
            //                (textFields[i] as PasswordBox).Password :
            //                (textFields[i] as TextBox).Text;
            //            }
            //        }
            //        alert.Close();
            //        OnEdit(texts);
            //    }
            //};
            //alert.ShowDialog();
        });
    }

    private static Element CreateTextField(string hint, string value, bool isPassword)
    {
        //if (!isPassword)
        //{
        //    TextBox field = new TextBox();
        //    //TODO:
        //    //field.setPromptText(hint);
        //    field.Text = value;
        //    return field;
        //}
        //else
        //{
        //    PasswordBox passwordField = new PasswordBox();
        //    //TODO:
        //    //passwordField.setPromptText(hint);
        //    passwordField.Password = value;
        //    return passwordField;
        //}
        return null;
    }


    public static void PromptSingleValue(string title, List<string> items,
                                         int currSelection, Action<int> onClickListener)
    {
        WindowUtils.RunOnMainThread(async () =>
        {
            string res = await AppShell.Current.DisplayActionSheet(title, "Cancel", null, items.ToArray());
            int idx = items.IndexOf(res);
            if (idx >= 0)
                onClickListener(idx);
        });
    }

    public static void PromptDialog(string title, string body,
                                    string buttonLabel1 = "Ok", Action buttonListener1 = null,
                                    string buttonLabel2 = "Cancel", Action buttonListener2 = null)
    {
        WindowUtils.RunOnMainThread(async () =>
        {
            bool res = await AppShell.Current.DisplayAlert(title, body, buttonLabel1, buttonLabel2);
            if (res && buttonListener1 != null)
            {
                buttonListener1();
                return;
            }
            if (buttonListener2 != null)
                buttonListener2();
        });
    }

    public static void PromptDialog(string body)
    {
        WindowUtils.RunOnMainThread(() =>
        {
            PromptDialog("", body, "Ok");
        });
    }
}