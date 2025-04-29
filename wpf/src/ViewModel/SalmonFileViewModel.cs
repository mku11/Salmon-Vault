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

using Mku.FS.Drive.Utils;
using Mku.SalmonFS.File;
using Salmon.Vault.Image;
using Salmon.Vault.Model;
using Salmon.Vault.Utils;
using System;
using System.ComponentModel;
using System.Windows.Media;

namespace Salmon.Vault.ViewModel;

public class SalmonFileViewModel : INotifyPropertyChanged
{
    private static string dateFormat = "dd/MM/yyyy hh:mm tt";

    private static AesFileAttrQueue AesFileAttrQueue { get; set; } = new AesFileAttrQueue();

    private string _name;
    public string Name
    {
        get
        {
            if (_name == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => salmonFile.Name, (basename) =>
                {
                    this.Name = basename;
                });
            }
            return _name;
        }
        set
        {
            if (_name != value)
            {
                _name = value;
                if (PropertyChanged != null)
                    PropertyChanged(this, new PropertyChangedEventArgs("Name"));
            }
        }
    }

    private string _date;
    public string Date
    {
        get
        {
            if (_date == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => GetDateText(), (date) =>
                {
                    this.Date = date;
                });
            }
            return _date;
        }
        set
        {
            if (_date != value)
            {
                _date = value;
                if (PropertyChanged != null)
                    PropertyChanged(this, new PropertyChangedEventArgs("Date"));
            }
        }
    }

    private string _type;
    public string Type
    {
        get
        {
            if (_type == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => GetExtText(), (type) =>
                {
                    this.Type = type;
                });
            }
            return _type;
        }
        set
        {
            if (_type != value)
            {
                _type = value;
                if (PropertyChanged != null)
                    PropertyChanged(this, new PropertyChangedEventArgs("Type"));
            }
        }
    }

    private string _sizeText;
    public string SizeText
    {
        get
        {
            if (_sizeText == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => GetSizeText(), (sizeText) =>
                {
                    this.SizeText = sizeText;
                });
            }
            return _sizeText;
        }
        set
        {
            if (_sizeText != value)
            {
                _sizeText = value;
                if (PropertyChanged != null)
                    PropertyChanged(this, new PropertyChangedEventArgs("SizeText"));
            }
        }
    }

    private string _path;
    public string Path
    {
        get
        {
            if (_path == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => salmonFile.Path, (path) =>
                {
                    this.Path = path;
                });
            }
            return _path;
        }
        set
        {
            if (_path != value)
            {
                _path = value;
                if (PropertyChanged != null)
                    PropertyChanged(this, new PropertyChangedEventArgs("Path"));
            }
        }
    }

    private bool _imageRequested = false;
    ImageSource _imageSource = null;
    public ImageSource Image
    {
        get
        {
            if (_imageSource == null && !_imageRequested)
            {
                _imageRequested = true;
                Thumbnails.GenerateThumbnailAsync(this);
            }
            return _imageSource;
        }
        set
        {
            if (_imageSource != value)
            {
                _imageSource = value;
                NotifyProperty("Image");
            }
        }
    }

    public Color _tintColor = default;
    public Color TintColor
    {
        get
        {
            if (_tintColor == default)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => Thumbnails.GetTintColor(salmonFile), (color) =>
                {
                    this.TintColor = color;
                });
            }
            return _tintColor;
        }
        set
        {
            if (_tintColor != value)
            {
                _tintColor = value;
                NotifyProperty("TintColor");
            }
        }
    }

    public string _ext;
    public string Ext
    {
        get
        {
            if (_ext == null)
            {
                AesFileAttrQueue.UpdatePropertyAsync(() => Thumbnails.GetExt(salmonFile), (ext) =>
                {
                    this.Ext = ext;
                });
            }
            return _ext;
        }
        set
        {
            if (value != null)
            {
                _ext = value;
                NotifyProperty("Ext");
            }
        }
    }

    private AesFile salmonFile;

    public SalmonFileViewModel(AesFile salmonFile)
    {
        this.salmonFile = salmonFile;
    }

    public void SetAesFile(AesFile file)
    {
        this.salmonFile = file;
        Update();
    }

    protected void NotifyProperty(string name)
    {
        if (PropertyChanged != null)
            PropertyChanged(this, new PropertyChangedEventArgs(name));
    }

    public event PropertyChangedEventHandler PropertyChanged;

    public void Update()
    {
        Name = salmonFile.Name;
        Date = GetDateText();
        SizeText = GetSizeText();
        Type = GetExtText();
        Path = salmonFile.Path;
        Ext = GetExtText();
        Thumbnails.ResetCache(salmonFile);
        Image = null;
        Thumbnails.GenerateThumbnailAsync(this);
        TintColor = default;
    }

    private string GetExtText()
    {
        return FileUtils.GetExtensionFromFileName(salmonFile.Name).ToLower();
    }

    private string GetSizeText()
    {
        if (!salmonFile.IsDirectory)
            return ByteUtils.GetBytes(salmonFile.RealFile.Length, 2);
        else
        {
            int items = salmonFile.ListFiles().Length;
            return items + " item" + (items == 1 ? "" : "s");
        }
    }

    private string GetDateText()
    {
        return DateTimeOffset.FromUnixTimeMilliseconds(salmonFile.LastDateModified).LocalDateTime.ToString(dateFormat);
    }

    public AesFile GetAesFile()
    {
        return salmonFile;
    }

    public SalmonFileViewModel[] ListFiles()
    {
        AesFile[] files = salmonFile.ListFiles();
        SalmonFileViewModel[] nfiles = new SalmonFileViewModel[files.Length];
        int count = 0;
        foreach (AesFile file in files)
            nfiles[count++] = new SalmonFileViewModel(file);
        return nfiles;
    }

    public long Size => salmonFile.RealFile.Length;

    public object Tag => salmonFile.Tag;

    public void CreateDirectory(string folderName, byte[] key, byte[] dirNameNonce)
    {
        salmonFile.CreateDirectory(folderName, key, dirNameNonce);
    }

    public long LastDateTimeModified => salmonFile.LastDateModified;

    public void Delete()
    {
        salmonFile.Delete();
    }

    override
    public string ToString()
    {
        return Name;
    }
}