﻿/*
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

using Mku.FS.File;
using Salmon.Vault.Services;
using Salmon.Vault.View;
using System.Windows;

namespace Salmon.Vault.WPF;

public partial class App : Application
{
    public MainWindow MainWindow { get; set; }

    private void Application_Startup(object sender, StartupEventArgs e)
    {
		// set to false for production
        HttpSyncClient.AllowClearTextTraffic = false;
        SetupServices();
        MainWindow = new MainWindow();
        MainWindow.Show();
    }

    private void SetupServices()
    {
        ServiceLocator.GetInstance().Register(typeof(ISettingsService), new WPFSettingsService());
        ServiceLocator.GetInstance().Register(typeof(IFileService), new WPFFileService());
        ServiceLocator.GetInstance().Register(typeof(IHttpFileService), new WPFHttpFileService());
        ServiceLocator.GetInstance().Register(typeof(IWSFileService), new WPFWSFileService());
        ServiceLocator.GetInstance().Register(typeof(IWebBrowserService), new WPFBrowserService());
        ServiceLocator.GetInstance().Register(typeof(IFileDialogService), new WPFFileDialogService());
        ServiceLocator.GetInstance().Register(typeof(IKeyboardService), new WPFKeyboardService());
    }
}
