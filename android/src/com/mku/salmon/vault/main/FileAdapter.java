package com.mku.salmon.vault.main;
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

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.media.MediaMetadataRetriever;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.CheckBox;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.arch.core.util.Function;
import androidx.recyclerview.widget.RecyclerView;

import com.mku.fs.drive.utils.FileUtils;
import com.mku.func.BiConsumer;
import com.mku.salmon.vault.android.R;
import com.mku.convert.BitConverter;
import com.mku.salmon.vault.image.Thumbnails;
import com.mku.salmon.vault.utils.ByteUtils;
import com.mku.salmon.vault.utils.IPropertyNotifier;
import com.mku.salmonfs.file.AesFile;

import java.net.HttpURLConnection;
import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingDeque;

public class FileAdapter extends RecyclerView.Adapter implements IPropertyNotifier {
    private static final String TAG = FileAdapter.class.getName();
    private static final int MAX_CACHE_SIZE = 20 * 1024 * 1024;
    private static final int THUMBNAIL_MAX_STEPS = 10;
    private static final long VIDEO_THUMBNAIL_MSECS = 3000;
    private static final int TASK_THREADS = 1;

    private final boolean displayItems = true;
    private final List<AesFile> items;
    private final LayoutInflater inflater;
    private final Function<Integer, Boolean> itemClicked;
    private final Activity activity;
    private final LinkedHashMap<AesFile, Bitmap> bitmapCache = new LinkedHashMap<>();
    // we use a deque and add jobs to the front for better user experience
    private final LinkedBlockingDeque<ViewHolder> tasks = new LinkedBlockingDeque<>();
    private AesFile lastSelected;
    private int cacheSize = 0;
    private LinkedHashSet<AesFile> selectedFiles = new LinkedHashSet<>();
    private SimpleDateFormat formatter = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss");
    private Mode mode = Mode.SINGLE_SELECT;
    private ExecutorService executor;
    private Runnable onCacheCleared;
    private HashSet<BiConsumer<Object, String>> observers = new HashSet<>();

    private ViewHolder animationViewHolder;

    public void setOnCacheCleared(Runnable onCacheCleared) {
        this.onCacheCleared = onCacheCleared;
    }

    public FileAdapter(Activity activity, List<AesFile> items, Function<Integer, Boolean> itemClicked) {
        this.items = items;
        this.inflater = LayoutInflater.from(activity);
        this.itemClicked = itemClicked;
        this.activity = activity;
        createThread();
    }

    public LinkedHashSet<AesFile> getSelectedFiles() {
        return selectedFiles;
    }

    public void selectAll(boolean value) {
        if (value)
            selectedFiles.addAll(items);
        else
            selectedFiles.clear();
        propertyChanged(this, "SelectedFiles");
        notifyDataSetChanged();
    }

    public Mode getMode() {
        return mode;
    }

    public void setMultiSelect(boolean value) {
        setMultiSelect(value, true);
    }

    public void setMultiSelect(boolean value, boolean clear) {
        if (clear)
            selectedFiles.clear();
        mode = value ? Mode.MULTI_SELECT : Mode.SINGLE_SELECT;
        propertyChanged(this, "SelectedFiles");
    }

    public void stop() {
        tasks.clear();
        unobservePropertyChanges();
        executor.shutdownNow();
    }

    private void createThread() {
        executor = Executors.newFixedThreadPool(TASK_THREADS);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        ViewHolder viewHolder = (ViewHolder) holder;
        try {
            viewHolder.salmonFile = items.get(position);
            updateSelected(viewHolder, viewHolder.salmonFile);
            updateBackgroundColor(viewHolder);
            viewHolder.filename.setText("");
            viewHolder.extension.setText("");
            viewHolder.filesize.setText("");
            viewHolder.filedate.setText("");
            viewHolder.thumbnail.setColorFilter(null);
            viewHolder.thumbnail.setImageBitmap(null);
            viewHolder.animate = false;
        } catch (Exception ex) {
            ex.printStackTrace();
        }
        tasks.remove(viewHolder);
        tasks.addFirst(viewHolder);
        executor.submit(() -> {
            try {
                ViewHolder task = tasks.take();
                retrieveFileInfo(task);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
    }

    private void updateSelected(ViewHolder viewHolder, AesFile salmonFile) {
        viewHolder.selected.setChecked(selectedFiles.contains(salmonFile));
    }

    private void retrieveFileInfo(ViewHolder viewHolder) {
        long size = 0;
        long date = 0;
        String items = "";
        AesFile file = viewHolder.salmonFile;
        try {
            String filename = viewHolder.salmonFile.getName();
            HttpURLConnection conn;
            activity.runOnUiThread(() -> {
                viewHolder.filename.setText(filename);
            });
            if (viewHolder.salmonFile.isDirectory() && displayItems)
                items = viewHolder.salmonFile.getChildrenCount() + " " + activity.getString(R.string.Items);
            else
                size = viewHolder.salmonFile.getRealFile().getLength();
            date = viewHolder.salmonFile.getLastDateModified();

            String finalItems = items;
            long finalSize = size;
            long finalDate = date;
            boolean isDir = viewHolder.salmonFile.isDirectory();
            if (file != viewHolder.salmonFile)
                return;
            activity.runOnUiThread(() -> {
                updateFileInfo(viewHolder, filename, finalItems,
                        finalSize, finalDate, isDir);
            });

            String ext = FileUtils.getExtensionFromFileName(filename).toLowerCase();
            if (viewHolder.salmonFile.isDirectory()) {
                activity.runOnUiThread(() -> {
                    viewHolder.thumbnail.setImageResource(R.drawable.folder);
                });
            } else if (bitmapCache.containsKey(file)) {
                activity.runOnUiThread(() -> {
                    updateIconFromCache(viewHolder, file, ext);
                });
            } else if (viewHolder.salmonFile.isFile()) {
                Bitmap bitmap = null;
                try {
                    java.io.File tmpFile = null;
                    if (ext.equals("mp4"))
                        tmpFile = Thumbnails.getVideoTmpFile(viewHolder.salmonFile);
                    bitmap = getFileThumbnail(viewHolder.salmonFile, 0, tmpFile, true);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                Bitmap finalBitmap = bitmap;
                if (file != viewHolder.salmonFile)
                    return;
                activity.runOnUiThread(() -> {
                    if (finalBitmap == null) {
                        updateFileIcon(viewHolder, ext);
                    } else {
                        Animation animation = AnimationUtils.loadAnimation(activity, R.anim.thumbnail);
                        viewHolder.thumbnail.startAnimation(animation);
                        updateThumbnailIcon(viewHolder, finalBitmap);
                    }
                });
            }

            viewHolder.thumbnail.setOnTouchListener(new View.OnTouchListener() {
                @Override
                public boolean onTouch(View view, MotionEvent motionEvent) {
                    if (animationViewHolder != viewHolder || !animationViewHolder.animate) {
                        resetAnimation();
                        animationViewHolder = viewHolder;
                        animationViewHolder.animate = true;
                        if (ext.equals("mp4")) {
                            animateVideo(viewHolder);
                        } else {
                            return false;
                        }
                    }
                    return true;
                }
            });
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void animateVideo(ViewHolder viewHolder) {
        executor.submit(() -> {
            int i = 0;
            java.io.File tmpFile = null;
            MediaMetadataRetriever retriever = null;
            try {
                tmpFile = Thumbnails.getVideoTmpFile(viewHolder.salmonFile);
                retriever = new MediaMetadataRetriever();
                retriever.setDataSource(tmpFile.getPath());
                while (animationViewHolder == viewHolder && animationViewHolder.animate) {
                    i++;
                    i %= THUMBNAIL_MAX_STEPS;
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    }
                    Bitmap bitmap = null;
                    try {
                        bitmap = retriever.getFrameAtTime(
                                (i + 1) * FileAdapter.VIDEO_THUMBNAIL_MSECS * 1000);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    if (bitmap == null)
                        continue;
                    Bitmap finalBitmap = bitmap;
                    activity.runOnUiThread(() -> {
                        if(animationViewHolder == viewHolder && animationViewHolder.animate)
                            updateThumbnailIcon(viewHolder, finalBitmap);
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                if (tmpFile != null) {
                    tmpFile.delete();
                    tmpFile.deleteOnExit();
                }
            }
        });
    }

    private void updateFileInfo(ViewHolder viewHolder, String filename,
                                String items, long size, long date, boolean isDir) {
        viewHolder.filename.setText(filename);
        viewHolder.filedate.setText(formatter.format(new Date(date)));
        if (isDir) {
            viewHolder.filesize.setText(items);
            viewHolder.extension.setText("");
            viewHolder.thumbnail.setColorFilter(null);
            viewHolder.thumbnail.setImageResource(R.drawable.folder);
        } else {
            viewHolder.thumbnail.setImageBitmap(null);
            viewHolder.extension.setText("");
            viewHolder.filesize.setText(ByteUtils.getBytes(size, 2));
        }
    }

    private boolean updateIconFromCache(ViewHolder viewHolder, AesFile file, String ext) {
        if (bitmapCache.containsKey(file)) {
            Bitmap bitmap = bitmapCache.get(file);
            if (bitmap == null)
                updateFileIcon(viewHolder, ext);
            else {
                updateThumbnailIcon(viewHolder, bitmapCache.get(file));
            }
            return true;
        }
        return false;
    }

    private void updateThumbnailIcon(ViewHolder viewHolder, Bitmap bitmap) {
        viewHolder.thumbnail.setImageBitmap(bitmap);
        viewHolder.thumbnail.setColorFilter(null);
        viewHolder.extension.setVisibility(View.GONE);
        viewHolder.extension.setText("");
    }

    private void updateFileIcon(ViewHolder viewHolder, String extension) {
        viewHolder.thumbnail.setImageResource(R.drawable.file_item);
        int extColor;
        try {
            extColor = getFileColorFromExtension(extension);
            viewHolder.thumbnail.setColorFilter(extColor, PorterDuff.Mode.MULTIPLY);
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
        viewHolder.extension.setVisibility(View.VISIBLE);
        viewHolder.extension.setText(extension);
    }

    private int getFileColorFromExtension(String extension) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] bytes = extension.getBytes(Charset.defaultCharset());
        byte[] hashValue = md.digest(bytes);
        StringBuilder sb = new StringBuilder();
        sb.append(BitConverter.toHex(hashValue));
        return Color.parseColor("#" + sb.substring(0, 6));
    }

    public void resetCache() {
        int reduceSize = 0;
        List<AesFile> keysToRemove = new LinkedList<>();
        for (AesFile key : bitmapCache.keySet()) {
            Bitmap bitmap = bitmapCache.get(key);
            if (bitmap != null)
                reduceSize += bitmap.getAllocationByteCount();
            if (reduceSize >= MAX_CACHE_SIZE / 2)
                break;
            keysToRemove.add(key);
        }
        for (AesFile key : keysToRemove) {
            Bitmap bitmap = bitmapCache.remove(key);
            if (bitmap != null)
                cacheSize -= bitmap.getAllocationByteCount();
        }
        onCacheCleared.run();
    }

    private Bitmap getFileThumbnail(AesFile salmonFile, int step, java.io.File tmpFile,
                                    boolean delete) throws Exception {
        Bitmap bitmap = null;
        String ext = FileUtils.getExtensionFromFileName(salmonFile.getName()).toLowerCase();
        if (ext.equals("mp4")) {
            bitmap = Thumbnails.getVideoThumbnail(tmpFile, VIDEO_THUMBNAIL_MSECS * (step + 1), delete);
        } else if (ext.equals("png") || ext.equals("jpg") || ext.equals("bmp") || ext.equals("webp") || ext.equals("gif")) {
            bitmap = Thumbnails.getImageThumbnail(salmonFile);
        }
        checkCacheSize();
        addBitmapToCache(salmonFile, bitmap);
        return bitmap;
    }

    private void addBitmapToCache(AesFile file, Bitmap bitmap) {
        bitmapCache.put(file, bitmap);
        if (bitmap != null)
            cacheSize += bitmap.getAllocationByteCount();
    }

    private void checkCacheSize() {
        if (cacheSize > MAX_CACHE_SIZE) {
            resetCache();
        }
    }

    @NonNull
    public FileAdapter.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = inflater.inflate(R.layout.file_item, parent, false);
        return new ViewHolder(view, itemClicked, this);
    }

    public AesFile getLastSelected() {
        return lastSelected;
    }

    private void updateBackgroundColor(ViewHolder viewHolder) {
        if (viewHolder.selected.isChecked())
            viewHolder.itemView.setBackgroundColor(activity.getColor(R.color.salmonItemSelectedBackground));
        else
            viewHolder.itemView.setBackgroundColor(0);
    }

    @Override
    public HashSet<BiConsumer<Object, String>> getObservers() {
        return observers;
    }

    public enum Mode {
        SINGLE_SELECT, MULTI_SELECT
    }

    public class ViewHolder extends RecyclerView.ViewHolder {
        public ImageView thumbnail;
        public TextView filename;
        public TextView filesize;
        public TextView filedate;
        public TextView extension;
        public CheckBox selected;
        public AesFile salmonFile;
        public boolean animate;

        public ViewHolder(View itemView, Function<Integer, Boolean> itemClicked, FileAdapter adapter) {
            super(itemView);
            thumbnail = itemView.findViewById(R.id.thumbnail);
            filename = itemView.findViewById(R.id.filename);
            filesize = itemView.findViewById(R.id.filesize);
            filedate = itemView.findViewById(R.id.filedate);
            extension = itemView.findViewById(R.id.extension);
            selected = itemView.findViewById(R.id.selected);

            itemView.setOnClickListener((View view) ->
            {
                AesFile salmonFile = items.get(super.getLayoutPosition());
                if (mode == Mode.MULTI_SELECT) {
                    selected.setChecked(!selected.isChecked());
                    if (selected.isChecked())
                        selectedFiles.add(salmonFile);
                    else selectedFiles.remove(salmonFile);
                    adapter.propertyChanged(this, "SelectedFiles");
                    updateBackgroundColor(this);
                } else if (itemClicked == null || !itemClicked.apply(super.getLayoutPosition())) {
                    adapter.lastSelected = salmonFile;
                    itemView.showContextMenu();
                }
                notifyItemChanged(getLayoutPosition());
                if (selectedFiles.size() == 0)
                    setMultiSelect(false);
            });

            itemView.setOnLongClickListener((View view) -> {
                AesFile salmonFile = items.get(super.getLayoutPosition());
                if (mode == Mode.SINGLE_SELECT) {
                    setMultiSelect(true);
                }
                selected.setChecked(true);
                selectedFiles.add(salmonFile);
                updateBackgroundColor(this);
                notifyItemChanged(getLayoutPosition());
                adapter.propertyChanged(this, "SelectedFiles");
                if (selectedFiles.size() == 0)
                    setMultiSelect(false);
                adapter.lastSelected = salmonFile;
                return true;
            });
        }
    }

    public synchronized void resetAnimation() {
        if(animationViewHolder != null)
            animationViewHolder.animate = false;
        animationViewHolder = null;
    }
}
