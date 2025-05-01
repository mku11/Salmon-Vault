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
using Android.Graphics;
using Android.Views;
using AndroidX.RecyclerView.Widget;
using Salmon.Vault.Utils;
using Salmon.Vault.Image;
using Java.Util.Concurrent;
using System.Collections.Concurrent;
using Android.Views.Animations;
using Java.Text;
using Java.Security;
using BitConverter = Mku.Convert.BitConverter;
using Salmon.Vault.DotNetAndroid;
using System;
using Android.App;
using System.Collections.Generic;
using Salmon.Vault.Extensions;
using Runnable = Java.Lang.Runnable;
using Android.Widget;
using System.ComponentModel;
using Java.Lang;
using Android.Media;
using System.Runtime.CompilerServices;
using Mku.SalmonFS.File;
using Mku.FS.Drive.Utils;

namespace Salmon.Vault.Main;

public class FileAdapter : RecyclerView.Adapter, INotifyPropertyChanged
{
    private static readonly string TAG = typeof(FileAdapter).Name;
    private const int MAX_CACHE_SIZE = 20 * 1024 * 1024;
    private static readonly int THUMBNAIL_MAX_STEPS = 10;
    private const long VIDEO_THUMBNAIL_MSECS = 3000;
    private static readonly int TASK_THREADS = 1;

    private bool displayItems = true;
    private List<AesFile> items;
    private LayoutInflater inflater;
    private Func<int, bool> itemClicked;
    private Activity activity;
    private ConcurrentDictionary<AesFile, Bitmap> bitmapCache = new ConcurrentDictionary<AesFile, Bitmap>();
    // we use a deque and add jobs to the front for better user experience
    private LinkedBlockingDeque tasks = new LinkedBlockingDeque();
    private AesFile lastSelected;
    private int cacheSize = 0;
    public HashSet<AesFile> SelectedFiles { get; } = new HashSet<AesFile>();
    private SimpleDateFormat formatter = new SimpleDateFormat("MM/dd/YYYY");
    private Mode mode = Mode.SINGLE_SELECT;
    private IExecutorService executor;
    public event EventHandler OnCacheCleared;
    public event PropertyChangedEventHandler PropertyChanged;
    private ViewHolder animationViewHolder;

    public FileAdapter(Activity activity, List<AesFile> items, Func<int, bool> itemClicked)
    {
        this.items = items;
        this.inflater = LayoutInflater.From(activity);
        this.itemClicked = itemClicked;
        this.activity = activity;
        CreateThread();
    }

    public HashSet<AesFile> GetSelectedFiles()
    {
        return SelectedFiles;
    }

    public void SelectAll(bool value)
    {
        if (value)
        {
            foreach (AesFile item in items)
            {
                SelectedFiles.Add(item);
            }
        }
        else
            SelectedFiles.Clear();
        PropertyChanged(this, new PropertyChangedEventArgs("SelectedFiles"));
        NotifyDataSetChanged();
    }

    public Mode GetMode()
    {
        return mode;
    }

    public void SetMultiSelect(bool value, bool clear = true)
    {
        if (clear)
            SelectedFiles.Clear();
        mode = value ? Mode.MULTI_SELECT : Mode.SINGLE_SELECT;
        PropertyChanged(this, new PropertyChangedEventArgs("SelectedFiles"));
    }

    public void Stop()
    {
        tasks.Clear();
        executor.ShutdownNow();
    }

    private void CreateThread()
    {
        executor = Executors.NewFixedThreadPool(TASK_THREADS);
    }

    public override int ItemCount => items.Count;

    public override void OnBindViewHolder(RecyclerView.ViewHolder holder, int position)
    {
        ViewHolder viewHolder = (ViewHolder)holder;
        try
        {
            viewHolder.salmonFile = items[position];
            UpdateSelected(viewHolder, viewHolder.salmonFile);
            UpdateBackgroundColor(viewHolder);
            viewHolder.filename.Text = "";
            viewHolder.extension.Text = "";
            viewHolder.filesize.Text = "";
            viewHolder.filedate.Text = "";
            viewHolder.thumbnail.SetColorFilter(null);
            viewHolder.thumbnail.SetImageBitmap(null);
            viewHolder.animate = false;
        }
        catch (System.Exception ex)
        {
            ex.PrintStackTrace();
        }

        tasks.Remove(viewHolder);
        tasks.AddFirst(viewHolder);
        executor.Submit(new Runnable(() =>
        {
            try
            {
                ViewHolder task = (ViewHolder)tasks.Take();
                RetrieveFileInfo(task);
            }
            catch (Java.Lang.InterruptedException e)
            {
                e.PrintStackTrace();
            }
        }));
    }

    private void UpdateSelected(ViewHolder viewHolder, AesFile salmonFile)
    {
        viewHolder.selected.Checked = SelectedFiles.Contains(salmonFile);
    }

    private void RetrieveFileInfo(ViewHolder viewHolder)
    {
        long size = 0;
        long date = 0;
        string items = "";
        AesFile file = viewHolder.salmonFile;
        try
        {
            string filename = viewHolder.salmonFile.Name;
            activity.RunOnUiThread(() =>
            {
                viewHolder.filename.Text = filename;
            });
            if (viewHolder.salmonFile.IsDirectory && displayItems)
                items = viewHolder.salmonFile.ChildrenCount + " " + activity.GetString(Resource.String.Items);
            else
                size = viewHolder.salmonFile.RealFile.Length;
            date = viewHolder.salmonFile.LastDateModified;

            string finalItems = items;
            long finalSize = size;
            long finalDate = date;
            bool isDir = viewHolder.salmonFile.IsDirectory;
            if (file != viewHolder.salmonFile)
                return;
            activity.RunOnUiThread(() =>
            {
                UpdateFileInfo(viewHolder, filename, finalItems,
                    viewHolder.salmonFile, finalSize, finalDate, isDir);
            });

            string ext = FileUtils.GetExtensionFromFileName(filename).ToLower();
            if (viewHolder.salmonFile.IsDirectory)
            {
                activity.RunOnUiThread(()=> {
                    viewHolder.thumbnail.SetImageResource(Resource.Drawable.folder);
                });
            }
            else if (bitmapCache.ContainsKey(file))
            {
                activity.RunOnUiThread(() =>
               {
                   UpdateIconFromCache(viewHolder, file, ext);
               });
            }
            else if (viewHolder.salmonFile.IsFile)
            {
                Bitmap bitmap = null;
                try
                {
                    Java.IO.File tmpFile = null;
                    if (ext.Equals("mp4"))
                        tmpFile = Thumbnails.GetVideoTmpFile(viewHolder.salmonFile);
                    bitmap = GetFileThumbnail(viewHolder.salmonFile, 0, tmpFile, true);
                }
                catch (System.Exception e)
                {
                    e.PrintStackTrace();
                }
                Bitmap finalBitmap = bitmap;
                if (file != viewHolder.salmonFile)
                    return;
                activity.RunOnUiThread(() =>
                {
                    if (finalBitmap == null)
                    {
                        UpdateFileIcon(viewHolder, ext);
                    }
                    else
                    {
                        Animation animation = AnimationUtils.LoadAnimation(activity, Resource.Animation.thumbnail);
                        viewHolder.thumbnail.StartAnimation(animation);
                        UpdateThumbnailIcon(viewHolder, finalBitmap);
                    }
                });
            }

            viewHolder.thumbnail.Touch += (sender, args) =>
            {
                if (animationViewHolder != viewHolder || !animationViewHolder.animate)
                {
                    ResetAnimation();
                    animationViewHolder = viewHolder;
                    animationViewHolder.animate = true;
                    if (ext.Equals("mp4"))
                    {
                        AnimateVideo(viewHolder);
                    }
                    else
                    {
                        args.Handled = false;
                        return;
                    }
                }
                args.Handled = true;
            };
        }
        catch (System.Exception ex)
        {
            ex.PrintStackTrace();
        }
    }

    private void AnimateVideo(ViewHolder viewHolder)
    {
        executor.Submit(new Runnable(() =>
        {
            int i = 0;
            Java.IO.File tmpFile = null;
            MediaMetadataRetriever retriever = null;
            try
            {
                tmpFile = Thumbnails.GetVideoTmpFile(viewHolder.salmonFile);
                retriever = new MediaMetadataRetriever();
                retriever.SetDataSource(tmpFile.Path);
                while (animationViewHolder == viewHolder && animationViewHolder.animate)
                {
                    i++;
                    i %= THUMBNAIL_MAX_STEPS;
                    try
                    {
                        Thread.Sleep(1000);
                    }
                    catch (InterruptedException e)
                    {
                        throw new RuntimeException(e);
                    }
                    Bitmap bitmap = null;
                    try
                    {
                        bitmap = retriever.GetFrameAtTime(
                                (i + 1) * FileAdapter.VIDEO_THUMBNAIL_MSECS * 1000);
                    }
                    catch (System.Exception e)
                    {
                        e.PrintStackTrace();
                    }
                    if (bitmap == null)
                        continue;
                    Bitmap finalBitmap = bitmap;
                    activity.RunOnUiThread(() =>
                    {
                        if (animationViewHolder == viewHolder && animationViewHolder.animate)
                            UpdateThumbnailIcon(viewHolder, finalBitmap);
                    });
                }
            }
            catch (System.Exception e)
            {
                e.PrintStackTrace();
            }
            finally
            {
                if (tmpFile != null)
                {
                    tmpFile.Delete();
                    tmpFile.DeleteOnExit();
                }
            }
        }));
    }

    private void UpdateFileInfo(ViewHolder viewHolder, string filename,
                                string items, AesFile salmonFile, long size, long date, bool isDir)
    {
        viewHolder.filename.Text = filename;
        viewHolder.filedate.Text = formatter.Format(new Java.Util.Date(date));
        if (isDir)
        {
            viewHolder.filesize.Text = items;
            viewHolder.extension.Text = "";
            viewHolder.thumbnail.SetColorFilter(null);
            viewHolder.thumbnail.SetImageResource(Resource.Drawable.folder);
        }
        else
        {
            viewHolder.thumbnail.SetImageBitmap(null);
            viewHolder.extension.Text = "";
            viewHolder.filesize.Text = ByteUtils.GetBytes(size, 2);
        }
    }

    private bool UpdateIconFromCache(ViewHolder viewHolder, AesFile file, string ext)
    {
        if (bitmapCache.ContainsKey(file))
        {
            Bitmap bitmap = bitmapCache[file];
            if (bitmap == null)
                UpdateFileIcon(viewHolder, ext);
            else
            {
                UpdateThumbnailIcon(viewHolder, bitmapCache[file]);
            }
            return true;
        }
        return false;
    }

    private void UpdateThumbnailIcon(ViewHolder viewHolder, Bitmap bitmap)
    {
        viewHolder.thumbnail.SetImageBitmap(bitmap);
        viewHolder.thumbnail.SetColorFilter(null);
        viewHolder.extension.Visibility = ViewStates.Gone;
        viewHolder.extension.Text = "";
    }

    private void UpdateFileIcon(ViewHolder viewHolder, string extension)
    {
        viewHolder.thumbnail.SetImageResource(Resource.Drawable.file_item);
        int extColor;
        try
        {
            extColor = GetFileColorFromExtension(extension);
            viewHolder.thumbnail.SetColorFilter(new Color(extColor), PorterDuff.Mode.Multiply);
        }
        catch (NoSuchAlgorithmException e)
        {
            e.PrintStackTrace();
        }
        viewHolder.extension.Visibility = ViewStates.Visible;
        viewHolder.extension.Text = extension;
    }

    private int GetFileColorFromExtension(string extension)
    {
        MessageDigest md = MessageDigest.GetInstance("SHA-256");
        byte[] bytes = System.Text.Encoding.UTF8.GetBytes(extension);
        byte[] hashValue = md.Digest(bytes);
        Java.Lang.StringBuilder sb = new Java.Lang.StringBuilder();
        sb.Append(BitConverter.ToHex(hashValue));
        return Color.ParseColor("#" + sb.Substring(0, 6));
    }

    public void ResetCache()
    {
        int reduceSize = 0;
        List<AesFile> keysToRemove = new List<AesFile>();
        foreach (AesFile key in bitmapCache.Keys)
        {
            Bitmap bitmap = bitmapCache[key];
            if (bitmap != null)
                reduceSize += bitmap.AllocationByteCount;
            if (reduceSize >= MAX_CACHE_SIZE / 2)
                break;
            keysToRemove.Add(key);
        }
        foreach (AesFile key in keysToRemove)
        {
            bitmapCache.Remove(key, out Bitmap bitmap);
            if (bitmap != null)
                cacheSize -= bitmap.AllocationByteCount;
        }
        OnCacheCleared(this, new EventArgs());
    }

    private Bitmap GetFileThumbnail(AesFile salmonFile, int step, Java.IO.File tmpFile,
                                    bool delete)
    {
        Bitmap bitmap = null;
        string ext = FileUtils.GetExtensionFromFileName(salmonFile.Name).ToLower();
        if (ext.Equals("mp4"))
        {
            bitmap = Thumbnails.GetVideoThumbnail(tmpFile, VIDEO_THUMBNAIL_MSECS * (step + 1), delete);
        }
        else if (ext.Equals("png") || ext.Equals("jpg") || ext.Equals("bmp") || ext.Equals("webp") || ext.Equals("gif"))
        {
            bitmap = Thumbnails.GetImageThumbnail(salmonFile);
        }
        CheckCacheSize();
        AddBitmapToCache(salmonFile, bitmap);
        return bitmap;
    }

    private void AddBitmapToCache(AesFile file, Bitmap bitmap)
    {
        bitmapCache[file] = bitmap;
        if (bitmap != null)
            cacheSize += bitmap.AllocationByteCount;
    }

    private void CheckCacheSize()
    {
        if (cacheSize > MAX_CACHE_SIZE)
        {
            ResetCache();
        }
    }

    public override RecyclerView.ViewHolder OnCreateViewHolder(ViewGroup parent, int viewType)
    {
        View view = inflater.Inflate(Resource.Layout.file_item, parent, false);
        return new ViewHolder(view, itemClicked, this);
    }

    public AesFile GetLastSelected()
    {
        return lastSelected;
    }

    private void UpdateBackgroundColor(ViewHolder viewHolder)
    {
        if (viewHolder.selected.Checked)
            viewHolder.ItemView.SetBackgroundColor(new Color(activity.GetColor(Resource.Color.salmonItemSelectedBackground)));
        else
            viewHolder.ItemView.SetBackgroundColor(new Color(0));
    }

    public enum Mode
    {
        SINGLE_SELECT, MULTI_SELECT
    }

    public class ViewHolder : RecyclerView.ViewHolder
    {
        private FileAdapter adapter;
        public ImageView thumbnail;
        public TextView filename;
        public TextView filesize;
        public TextView filedate;
        public TextView extension;
        public CheckBox selected;
        public AesFile salmonFile;
        public bool animate;

        public ViewHolder(View itemView, Func<int, bool> itemClicked, FileAdapter adapter) : base(itemView)
        {
            this.adapter = adapter;
            thumbnail = (ImageView)itemView.FindViewById(Resource.Id.thumbnail);
            filename = (TextView)itemView.FindViewById(Resource.Id.filename);
            filesize = (TextView)itemView.FindViewById(Resource.Id.filesize);
            filedate = (TextView)itemView.FindViewById(Resource.Id.filedate);
            extension = (TextView)itemView.FindViewById(Resource.Id.extension);
            selected = (CheckBox)itemView.FindViewById(Resource.Id.selected);

            itemView.Click += (object sender, EventArgs e) =>
            {
                if (base.LayoutPosition >= adapter.items.Count)
                    return;
                AesFile salmonFile = adapter.items[base.LayoutPosition];
                if (adapter.mode == Mode.MULTI_SELECT)
                {
                    selected.Checked = !selected.Checked;
                    if (selected.Checked)
                        adapter.SelectedFiles.Add(salmonFile);
                    else adapter.SelectedFiles.Remove(salmonFile);
                    adapter.PropertyChanged(this, new PropertyChangedEventArgs("SelectedFiles"));
                    adapter.UpdateBackgroundColor(this);
                }
                else if (itemClicked == null || !itemClicked(base.LayoutPosition))
                {
                    adapter.lastSelected = salmonFile;
                    itemView.ShowContextMenu();
                }
                adapter.lastSelected = salmonFile;
                adapter.NotifyItemChanged(LayoutPosition);
                if (adapter.SelectedFiles.Count == 0)
                    adapter.SetMultiSelect(false);
            };

            itemView.LongClick += (object sender, View.LongClickEventArgs e) =>
            {
                AesFile salmonFile = adapter.items[LayoutPosition];
                if (adapter.mode == Mode.SINGLE_SELECT)
                {
                    adapter.SetMultiSelect(true, false);
                }
                selected.Checked = true;
                adapter.SelectedFiles.Add(salmonFile);
                adapter.UpdateBackgroundColor(this);
                adapter.NotifyItemChanged(LayoutPosition);
                adapter.PropertyChanged(this, new PropertyChangedEventArgs("SelectedFiles"));
                if (adapter.SelectedFiles.Count == 0)
                    adapter.SetMultiSelect(false);
                adapter.lastSelected = salmonFile;
                e.Handled = true;
            };
        }
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    public void ResetAnimation()
    {
        if (animationViewHolder != null)
            animationViewHolder.animate = false;
        animationViewHolder = null;
    }
}