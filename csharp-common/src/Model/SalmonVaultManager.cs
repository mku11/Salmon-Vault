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
using Mku.FS.File;
using Mku.Salmon.Sequence;
using Mku.SalmonFS.Drive;
using Mku.SalmonFS.Drive.Utils;
using Mku.SalmonFS.File;
using Mku.SalmonFS.Sequence;
using Mku.Streams;
using Salmon.Vault.Config;
using Salmon.Vault.Dialog;
using Salmon.Vault.Settings;
using Salmon.Vault.Utils;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Salmon.Vault.Model;

public class SalmonVaultManager : INotifyPropertyChanged
{
    protected static readonly string SEQUENCER_DIR_NAME = ".salmon";
    protected static readonly string SERVICE_PIPE_NAME = "SalmonService";

    private static int bufferSize = 512 * 1024;
    private static int threads = 1;

    public static readonly int REQUEST_OPEN_VAULT_DIR = 1000;
    public static readonly int REQUEST_CREATE_VAULT_DIR = 1001;
    public static readonly int REQUEST_IMPORT_FILES = 1002;
    public static readonly int REQUEST_EXPORT_DIR = 1003;
    public static readonly int REQUEST_IMPORT_AUTH_FILE = 1004;
    public static readonly int REQUEST_EXPORT_AUTH_FILE = 1005;
    public static readonly int REQUEST_IMPORT_FOLDER = 1006;

    public bool PromptExitOnBack { get; set; }

    public string SequencerDefaultDirPath { get; set; } = SalmonConfig.GetPrivateDir() + System.IO.Path.DirectorySeparatorChar + SEQUENCER_DIR_NAME;

    protected string SequencerFilepath => SequencerDefaultDirPath + System.IO.Path.DirectorySeparatorChar
        + SalmonConfig.FILE_SEQ_FILENAME;

    public AesDrive Drive { get; private set; }

    public delegate bool OpenListViewItem(AesFile item);
    public OpenListViewItem OpenListItem;

    public delegate void UpdateItem(AesFile file);
    public UpdateItem UpdateListItem;

    public delegate void OnFileItemRemovedFromList(int position, AesFile file);
    public OnFileItemRemovedFromList OnFileItemRemoved;

    public delegate void OnFileItemAddedToList(int position, AesFile file);
    public OnFileItemAddedToList OnFileItemAdded;

    protected static SalmonVaultManager _instance;
    public static SalmonVaultManager Instance
    {
        [MethodImpl(MethodImplOptions.Synchronized)]
        get
        {
            if (_instance == null)
            {
                _instance = new SalmonVaultManager();
            }
            return _instance;
        }
    }

    private INonceSequencer _sequencer;
    public INonceSequencer Sequencer
    {
        get => _sequencer;
        protected set
        {
            _sequencer = value;
            if (this.Drive != null)
                this.Drive.Sequencer = value;
        }
    }

    public static int GetBufferSize()
    {
        return bufferSize;
    }

    public static void SetBufferSize(int bufferSize)
    {
        SalmonVaultManager.bufferSize = bufferSize;
    }

    public static int GetThreads()
    {
        return threads;
    }

    public static void SetThreads(int threads)
    {
        SalmonVaultManager.threads = threads;
    }


    private List<AesFile> _fileItemList;
    public List<AesFile> FileItemList
    {
        get => _fileItemList;
        private set
        {
            if (_fileItemList != value)
            {
                _fileItemList = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FileItemList"));
            }
        }
    }

    private HashSet<AesFile> _SelectedFiles = new HashSet<AesFile>();
    public HashSet<AesFile> SelectedFiles
    {
        get => _SelectedFiles;
        set
        {
            if (value != _SelectedFiles)
            {
                _SelectedFiles = value;
                PropertyChanged(this, new PropertyChangedEventArgs("SelectedFiles"));
            }
        }
    }

    private AesFile _currentItem;
    public AesFile CurrentItem
    {
        get => _currentItem;
        private set
        {
            if (value != _currentItem)
            {
                _currentItem = value;
                PropertyChanged(this, new PropertyChangedEventArgs("CurrentItem"));
            }
        }
    }

    private string _status = "";
    public string Status
    {
        get => _status;
        private set
        {
            if (value != _status)
            {
                _status = value;
                PropertyChanged(this, new PropertyChangedEventArgs("Status"));
            }
        }
    }

    private bool _isJobRunning;
    public bool IsJobRunning
    {
        get => _isJobRunning;
        private set
        {
            if (value != _isJobRunning)
            {
                _isJobRunning = value;
                PropertyChanged(this, new PropertyChangedEventArgs("IsJobRunning"));
            }
        }
    }

    private string _path;
    public string Path
    {
        get => _path;
        private set
        {
            if (value != _path)
            {
                _path = value;
                PropertyChanged(this, new PropertyChangedEventArgs("Path"));
            }
        }
    }

    private double _fileProgress;
    public double FileProgress
    {
        get => _fileProgress;
        private set
        {
            if (value != _fileProgress)
            {
                _fileProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FileProgress"));
            }
        }
    }

    private double _filesProgress;
    public double FilesProgress
    {
        get => _filesProgress;
        private set
        {
            if (value != _filesProgress)
            {
                _filesProgress = value;
                PropertyChanged(this, new PropertyChangedEventArgs("FilesProgress"));
            }
        }
    }

    public AesFile CurrDir;
    private AesFileCommander fileCommander;
    private AesFile[] copyFiles;
    private AesFile[] salmonFiles;
    private string searchTerm;
    public Mode FileManagerMode { get; private set; } = Mode.Browse;

    public event PropertyChangedEventHandler PropertyChanged;

    protected SalmonVaultManager()
    {
        SalmonSettings.GetInstance().Load();
        SetupFileCommander();
        SetupSalmonManager();
    }

    public void Initialize()
    {

    }

    public bool OnOpenItem(int selectedItem)
    {
        try
        {
            AesFile selectedFile = FileItemList[selectedItem];
            return OpenItem(selectedFile);
        }
        catch (Exception e)
        {
            Console.Error.WriteLine(e);
        }
        return false;
    }

    public void SetPathText(string value)
    {
        if (value == null)
        {
            Path = "";
            return;
        }

        if (value.StartsWith("/"))
            value = value.Substring(1);
        Path = "fs://" + value;
    }

    public void StopOperation()
    {
        fileCommander.Cancel();
        FileManagerMode = Mode.Browse;
        ClearSelectedFiles();
        ClearCopiedFiles();
        FileProgress = 0;
        FilesProgress = 0;
        SetTaskRunning(false);
        SetTaskMessage("");
    }

    public void CopySelectedFiles()
    {
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        FileManagerMode = Mode.Copy;
        copyFiles = SelectedFiles.ToArray();
        SetTaskRunning(true, false);
        SetTaskMessage(copyFiles.Length + " Items selected for copy");
    }

    public void CutSelectedFiles()
    {
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        FileManagerMode = Mode.Move;
        copyFiles = SelectedFiles.ToArray();
        SetTaskRunning(true, false);
        SetTaskMessage(copyFiles.Length + " Items selected for move");
    }

    private void SetupFileCommander()
    {
        fileCommander = new AesFileCommander(bufferSize, bufferSize, threads);
    }

    public void Refresh()
    {
        if (CheckFileSearcher())
            return;
        if (Drive == null)
            return;
        Task.Run(() =>
        {
            if (FileManagerMode != Mode.Search)
                salmonFiles = CurrDir.ListFiles();
            PopulateFileList(SelectedFiles.FirstOrDefault((AesFile)null));
        });
    }

    private bool CheckFileSearcher()
    {
        if (fileCommander.IsFileSearcherRunning())
        {
            SalmonDialogs.PromptAnotherProcessRunning();
            return true;
        }
        return false;
    }

    private void PopulateFileList(AesFile currentFile)
    {
        Task.Run(() =>
        {
            SelectedFiles.Clear();
            try
            {
                if (FileManagerMode == Mode.Search)
                    SetPathText(CurrDir.Path + "?search=" + searchTerm);
                else
                    SetPathText(CurrDir.Path);
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine(exception);
                SalmonDialog.PromptDialog("Error", exception.Message);
            }

            List<AesFile> list = new List<AesFile>();
            foreach (AesFile file in salmonFiles)
            {
                try
                {
                    list.Add(file);
                }
                catch (Exception e)
                {
                    Console.Error.WriteLine(e);
                }
            }
            FileItemList = list;
            AesFile currFile = FindCurrentItem(currentFile);
            CurrentItem = currFile;
        });
    }

    public virtual void SetupSalmonManager()
    {
        try
        {
            // file sequencer for mobile is secure since it runs in sandbox
            SetupFileSequencer();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine(e);
            SalmonDialog.PromptDialog("Error", "Error during initializing: " + e.Message);
        }
    }

    private void SetupFileSequencer()
    {
        IFile dirFile = new File(SequencerDefaultDirPath);
        if (!dirFile.Exists)
            dirFile.Mkdir();
        IFile seqFile = new File(SequencerFilepath);
        FileSequencer sequencer = new FileSequencer(seqFile, CreateSerializer());
        this.Sequencer = sequencer;
    }

    virtual
    protected INonceSequenceSerializer CreateSerializer()
    {
        return new SequenceSerializer();
    }

    public void PasteSelected()
    {
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        CopySelectedFiles(FileManagerMode == Mode.Move);
    }

    public void SetTaskRunning(bool value, bool progress = true)
    {
        if (progress)
            IsJobRunning = value;
    }

    public void SetTaskMessage(string msg)
    {
        Status = msg ?? "";
    }

    public void OpenVault(IFile dir, string password)
    {
        if (dir == null)
            return;

        ThreadPool.QueueUserWorkItem(state =>
        {
            try
            {
                PropertyChanged(this, new PropertyChangedEventArgs("taskRunning"));
                CloseVault();
                this.Drive = AesDrive.OpenDrive(dir, GetDriveClassType(dir), password, this.Sequencer);
                this.CurrDir = this.Drive.Root;
                Refresh();
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
                string msg = "Could not open vault: " + e.Message + ". " +
                        (e.InnerException != null ? e.InnerException.Message : "");
                SalmonDialog.PromptDialog("Error", msg);
            }
            finally
            {
                PropertyChanged(this, new PropertyChangedEventArgs("taskComplete"));
            }
        });
    }

    virtual
    protected Type GetDriveClassType(IFile vaultDir)
    {
        if (vaultDir is File)
            return typeof(Drive);
        else if (vaultDir is HttpFile)
            return typeof(HttpDrive);
        else if (vaultDir is WSFile)
            return typeof(WSDrive);
        throw new Exception("Unknown drive type");
    }

    public void DeleteSelectedFiles()
    {
        DeleteFiles(SelectedFiles.ToArray());
        ClearSelectedFiles();
    }

    private void CopySelectedFiles(bool move)
    {
        CopyFiles(copyFiles, CurrDir, move);
        ClearSelectedFiles();
    }

    public void DeleteFiles(AesFile[] files)
    {
        if (files == null)
            return;
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        ThreadPool.QueueUserWorkItem(state =>
        {
            FileProgress = 0;
            FilesProgress = 0;

            SetTaskRunning(true);

            Exception exception = null;
            int[] processedFiles = new int[] { -1 };
            List<AesFile> failedFiles = new List<AesFile>();
            try
            {
                FileCommander.BatchDeleteOptions deleteOptions = new FileCommander.BatchDeleteOptions();
                deleteOptions.onProgressChanged = (taskProgress) =>
                {
                    if (processedFiles[0] < taskProgress.ProcessedFiles)
                    {
                        try
                        {
                            if (taskProgress.ProcessedBytes != taskProgress.TotalBytes)
                            {
                                SetTaskMessage("Deleting: " + taskProgress.File.Name
                                    + " " + (taskProgress.ProcessedFiles + 1) + "/" + taskProgress.TotalFiles);
                            }
                        }
                        catch (Exception e)
                        {
                        }
                        processedFiles[0] = taskProgress.ProcessedFiles;
                    }
                    FileProgress = taskProgress.ProcessedBytes / (double)taskProgress.TotalBytes;
                    FilesProgress = taskProgress.ProcessedFiles / (double)taskProgress.TotalFiles;
                };
                deleteOptions.onFailed = (file, ex) =>
                {
                    failedFiles.Add((AesFile)file);
                    exception = ex;
                };
                fileCommander.DeleteFiles(files, deleteOptions);
            }
            catch (Exception e)
            {
                if (!fileCommander.AreJobsStopped())
                {
                    Console.Error.WriteLine(e);
                    SalmonDialog.PromptDialog("Error", "Could not delete files: " + e.Message, "Ok");
                }
            }
            if (fileCommander.AreJobsStopped())
                SetTaskMessage("Delete Stopped");
            else if (failedFiles.Count > 0)
                SalmonDialog.PromptDialog("Delete", "Some files failed: " + exception.Message);
            else
                SetTaskMessage("Delete Complete");
            FileProgress = 1;
            FilesProgress = 1;
            Refresh();
            SetTaskRunning(false);
            copyFiles = null;
            FileManagerMode = Mode.Browse;
        });
    }

    private void CopyFiles(AesFile[] files, AesFile dir, bool move)
    {
        if (files == null)
            return;
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        ThreadPool.QueueUserWorkItem(state =>
        {
            FileProgress = 0;
            FilesProgress = 0;

            SetTaskRunning(true);
            string action = move ? "Moving" : "Copying";
            Exception exception = null;
            int[] processedFiles = new int[] { -1 };
            List<AesFile> failedFiles = new List<AesFile>();
            try
            {
                FileCommander.BatchCopyOptions copyOptions = new FileCommander.BatchCopyOptions();
                copyOptions.move = move;
                copyOptions.onProgressChanged =
                    (taskProgress) =>
                    {
                        if (processedFiles[0] < taskProgress.ProcessedFiles)
                        {
                            try
                            {
                                SetTaskMessage(action + ": " + taskProgress.File.Name
                                    + " " + (taskProgress.ProcessedFiles + 1) + "/" + taskProgress.TotalFiles);
                            }
                            catch (Exception e)
                            {
                            }
                            processedFiles[0] = taskProgress.ProcessedFiles;
                        }
                        FileProgress = taskProgress.ProcessedBytes / (double)taskProgress.TotalBytes;
                        FilesProgress = taskProgress.ProcessedFiles / (double)taskProgress.TotalFiles;
                    };
                copyOptions.autoRename = AesFile.AutoRename;
                copyOptions.autoRenameFolders = true;
                copyOptions.onFailed = (file, ex) =>
                {
                    HandleThrowException(ex);
                    failedFiles.Add((AesFile)file);
                    exception = ex;
                };
                fileCommander.CopyFiles(files, dir, copyOptions);
            }
            catch (Exception e)
            {
                if (!fileCommander.AreJobsStopped())
                {
                    Console.Error.WriteLine(e);
                    SalmonDialog.PromptDialog("Error", "Could not copy files: " + e.Message, "Ok");
                }
            }
            if (fileCommander.AreJobsStopped())
                SetTaskMessage(action + " Stopped");
            else if (failedFiles.Count > 0)
                SalmonDialog.PromptDialog(action, "Some files failed: " + exception.Message);
            else
                SetTaskMessage(action + " Complete");
            FileProgress = 1;
            FilesProgress = 1;
            SetTaskRunning(false);
            Refresh();
            copyFiles = null;
            FileManagerMode = Mode.Browse;
        });
    }

    public void ExportSelectedFiles(IFile exportDir, bool deleteSource)
    {
        if (Drive == null)
            return;
        ExportFiles(SelectedFiles.ToArray(), exportDir, deleteSource, (files) =>
        {
            Refresh();
        });
        ClearSelectedFiles();
    }

    private void ClearSelectedFiles()
    {
        SelectedFiles = new HashSet<AesFile>();
    }

    public virtual bool HandleException(Exception exception)
    {
        return false;
    }

    public void CloseVault()
    {
        try
        {
            FileItemList = null;
            CurrDir = null;
            ClearCopiedFiles();
            SetPathText(null);
            if (this.Drive != null)
            {
                this.Drive.Close();
                this.Drive = null;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
        }
    }

    public bool OpenItem(AesFile selectedFile)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            int position = FileItemList.IndexOf(selectedFile);
            if (position < 0)
                return;
            if (selectedFile.IsDirectory)
            {
                if (CheckFileSearcher())
                    return;
                CurrDir = (selectedFile);
                salmonFiles = CurrDir.ListFiles();
                PopulateFileList(null);
                return;
            }
            string filename = selectedFile.Name;
            AesFile item = FileItemList[position];
            OpenListItem(item);
        });
        return true;
    }

    public void GoBack()
    {
        if (FileManagerMode == Mode.Search && fileCommander.IsFileSearcherRunning())
        {
            fileCommander.StopFileSearch();
        }
        else if (FileManagerMode == Mode.Search)
        {
            Task.Run(() =>
            {
                FileManagerMode = Mode.Browse;
                salmonFiles = CurrDir.ListFiles();
                PopulateFileList(null);
            });
        }
        else if (CanGoBack())
        {
            AesFile finalParent = CurrDir.Parent;
            Task.Run(() =>
            {
                if (CheckFileSearcher())
                    return;
                AesFile parentDir = CurrDir;
                CurrDir = finalParent;
                salmonFiles = CurrDir.ListFiles();
                PopulateFileList(parentDir);
            });
        }
        else if (PromptExitOnBack)
        {
            SalmonDialogs.PromptExit();
        }
    }

    private AesFile FindCurrentItem(AesFile currentFile)
    {
        if (currentFile == null)
            return null;
        foreach (AesFile file in FileItemList)
        {
            if (file.RealFile.Path.Equals(currentFile.RealFile.Path))
            {
                SelectedFiles.Clear();
                SelectedFiles.Add(file);
                return file;
            }
        }
        return null;
    }

    public void RenameFile(AesFile file, string newFilename)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            try
            {
                fileCommander.RenameFile(file, newFilename);
                WindowUtils.RunOnMainThread(() =>
                {
                    SalmonVaultManager.Instance.UpdateListItem(file);
                });
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
                SalmonDialog.PromptDialog("Error", "Could not rename file: " + e.Message);
            }
        });
    }


    public void CreateDirectory(string folderName)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            AesFile file = null;
            try
            {
                file = SalmonVaultManager.Instance.CurrDir.CreateDirectory(folderName);
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine(exception);
                if (!SalmonVaultManager.Instance.HandleException(exception))
                {
                    SalmonDialog.PromptDialog("Error", "Could not create folder: " + exception.Message);
                }
            }
            finally
            {
                if (file != null)
                    SelectedFiles = new HashSet<AesFile>(new AesFile[] { file });
                SalmonVaultManager.Instance.Refresh();
            }
        });
    }

    public void CreateFile(string fileName)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            RandomAccessStream stream = null;
            AesFile file = null;
            try
            {
                file = SalmonVaultManager.Instance.CurrDir.CreateFile(fileName);
                file.SetApplyIntegrity(true);
                stream = file.GetOutputStream();
                stream.Write(UTF8Encoding.UTF8.GetBytes("\n"), 0, 1);
                stream.Flush();
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine(exception);
                if (!SalmonVaultManager.Instance.HandleException(exception))
                {
                    SalmonDialog.PromptDialog("Error", "Could not create file: " + exception.Message);
                }
            }
            finally
            {
                if (stream != null)
                    stream.Close();
                if (file != null)
                    SelectedFiles = new HashSet<AesFile>(new AesFile[] { file });
                SalmonVaultManager.Instance.Refresh();
            }
        });
    }

    public void SetPassword(string pass)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            try
            {
                PropertyChanged(this, new PropertyChangedEventArgs("taskRunning"));
                SalmonVaultManager.Instance.Drive.SetPassword(pass);
                SalmonDialog.PromptDialog("Password changed");
            }
            catch (Exception e)
            {
                SalmonDialog.PromptDialog("Could not change password: " + e.Message);
            }
            finally
            {
                PropertyChanged(this, new PropertyChangedEventArgs("taskComplete"));
            }
        });
    }

    public enum Mode
    {
        Browse, Search, Copy, Move
    }

    public void ExportFiles(AesFile[] items, IFile exportDir, bool deleteSource, Action<IFile[]> OnFinished)
    {
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        ThreadPool.QueueUserWorkItem(state =>
        {
            FileProgress = 0;
            FilesProgress = 0;
            SetTaskRunning(true);

            Exception exception = null;
            int[] processedFiles = new int[] { -1 };
            IFile[] files = null;
            List<AesFile> failedFiles = new List<AesFile>();
            try
            {
                FileCommander.BatchExportOptions exportOptions = new FileCommander.BatchExportOptions();
                exportOptions.integrity = true;
                exportOptions.deleteSource = deleteSource;
                exportOptions.autoRename = IFile.AutoRename;
                exportOptions.onProgressChanged = (taskProgress) =>
                {
                    if (processedFiles[0] < taskProgress.ProcessedFiles)
                    {
                        try
                        {
                            SetTaskMessage("Exporting: " + taskProgress.File.Name
                                + " " + (taskProgress.ProcessedFiles + 1) + "/" + taskProgress.TotalFiles);
                        }
                        catch (Exception e)
                        {
                        }
                        processedFiles[0] = taskProgress.ProcessedFiles;
                    }
                    FileProgress = taskProgress.ProcessedBytes / (double)taskProgress.TotalBytes;
                    FilesProgress = taskProgress.ProcessedFiles / (double)taskProgress.TotalFiles;
                };
                exportOptions.onFailed = (file, ex) =>
                {
                    failedFiles.Add((AesFile)file);
                    exception = ex;
                };
                files = fileCommander.ExportFiles(items, exportDir, exportOptions);
                if (OnFinished != null)
                    OnFinished(files);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
                SalmonDialog.PromptDialog("Error", "Error while exporting files: " + e.Message);
            }
            if (fileCommander.AreJobsStopped())
                SetTaskMessage("Export Stopped");
            else if (failedFiles.Count > 0)
                SalmonDialog.PromptDialog("Export", "Some files failed: " + exception.Message);
            else if (files != null)
            {
                SetTaskMessage("Export Complete");
            }
            FileProgress = 1;
            FilesProgress = 1;
            SetTaskRunning(false);
            Refresh();
        });
    }

    public void ImportFiles(IFile[] files, AesFile importDir, bool deleteSource,
                            Action<AesFile[]> OnFinished, bool autorename = true)
    {
        if (IsJobRunning)
            throw new Exception("Another Job is Running");
        ThreadPool.QueueUserWorkItem(state =>
        {
            FileProgress = 0;
            FilesProgress = 0;

            SetTaskRunning(true);

            Exception exception = null;
            int[] processedFiles = new int[] { -1 };
            AesFile[] aesFiles = null;
            List<IFile> failedFiles = new List<IFile>();
            try
            {
                FileCommander.BatchImportOptions importOptions = new FileCommander.BatchImportOptions();
                importOptions.integrity = true;
                importOptions.deleteSource = deleteSource;
                if (autorename)
                    importOptions.autoRename = IFile.AutoRename;
                importOptions.onProgressChanged = (taskProgress) =>
                {
                    if (processedFiles[0] < taskProgress.ProcessedFiles)
                    {
                        try
                        {
                            SetTaskMessage("Importing: " + taskProgress.File.Name
                                + " " + (taskProgress.ProcessedFiles + 1) + "/" + taskProgress.TotalFiles);
                        }
                        catch (Exception e)
                        {
                        }
                        processedFiles[0] = taskProgress.ProcessedFiles;
                    }
                    FileProgress = taskProgress.ProcessedBytes / (double)taskProgress.TotalBytes;
                    FilesProgress = taskProgress.ProcessedFiles / (double)taskProgress.TotalFiles;
                };
                importOptions.onFailed = (file, ex) =>
                {
                    HandleThrowException(ex);
                    failedFiles.Add(file);
                    exception = ex;
                };
                aesFiles = fileCommander.ImportFiles(files, importDir, importOptions);
                OnFinished(aesFiles);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
                if (!HandleException(e))
                {
                    SalmonDialog.PromptDialog("Error", "Error while importing files: " + e.Message);
                }
            }
            if (fileCommander.AreJobsStopped())
                SetTaskMessage("Import Stopped");
            else if (failedFiles.Count > 0)
                SalmonDialog.PromptDialog("Import", "Some files failed: " + exception.Message);
            else if (aesFiles != null)
                SetTaskMessage("Import Complete");
            FileProgress = 1;
            FilesProgress = 1;
            SetTaskRunning(false);
            Refresh();
        });
    }

    public virtual void HandleThrowException(Exception ex) { }

    public void Search(string value, bool any)
    {
        searchTerm = value;
        if (CheckFileSearcher())
            return;
        ThreadPool.QueueUserWorkItem(state =>
        {
            FileManagerMode = Mode.Search;
            FileProgress = 0;
            FilesProgress = 0;
            try
            {
                salmonFiles = new AesFile[] { };
                PopulateFileList(null);
                // FIXME: wait till observers clear the previous list
                Thread.Sleep(2000);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
            }
            SetTaskRunning(true);
            Status = "Searching";
            FileSearcher.SearchOptions searchOptions = new FileSearcher.SearchOptions();
            searchOptions.anyTerm = any;
            searchOptions.onResultFound = (IVirtualFile salmonFile) =>
            {
                int position = 0;
                foreach (AesFile file in FileItemList)
                {
                    if (((AesFile)salmonFile).Tag != null &&
                        (file.Tag == null || (int)((AesFile)salmonFile).Tag > (int)file.Tag))
                        break;
                    position++;
                }
                try
                {
                    FileItemList.Insert(position, (AesFile)salmonFile);
                    OnFileItemAdded(position, (AesFile)salmonFile);
                }
                catch (Exception e)
                {
                    Console.Error.WriteLine(e);
                }
            };
            IVirtualFile[] files = fileCommander.Search(CurrDir, value, searchOptions);
            this.salmonFiles = new AesFile[files.Length];
            for (int i = 0; i < files.Length; i++)
                this.salmonFiles[i] = (AesFile)files[i];
            if (!fileCommander.IsFileSearcherStopped())
                Status = "Search Complete";
            else
                Status = "Search Stopped";
            SetTaskRunning(false);
        });
    }

    public void CreateVault(IFile dir, string password)
    {
        ThreadPool.QueueUserWorkItem(state =>
        {
            try
            {
                if (!dir.Exists)
                {
                    dir.Mkdir();
                }
                this.Drive = AesDrive.CreateDrive(dir, GetDriveClassType(dir), password, Sequencer);
                this.CurrDir = this.Drive.Root;
                Refresh();
                SalmonDialog.PromptDialog("Action", "Vault created, you can start importing your files");
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e);
                SalmonDialog.PromptDialog("Error", "Could not create vault: " + e.Message + ". " +
                        (e.InnerException != null ? e.InnerException.Message : ""));
            }
        });
    }

    public void ClearCopiedFiles()
    {
        copyFiles = null;
        FileManagerMode = Mode.Browse;
        SetTaskRunning(false, false);
        SetTaskMessage("");
    }

    public string GetFileProperties(AesFile item)
    {
        return "Name: " + item.Name + "\n" +
                "Path: " + item.Path + "\n" +
                (!item.IsDirectory ? ("Size: " + ByteUtils.GetBytes(item.Length, 2)
                        + " (" + item.Length + " bytes)") : "Items: " + item.ListFiles().Length) + "\n" +
                "Encrypted Name: " + item.RealFile.Name + "\n" +
                "Encrypted Path: " + item.RealFile.DisplayPath + "\n" +
                (!item.IsDirectory ? "Encrypted Size: " + ByteUtils.GetBytes(item.RealFile.Length, 2)
                        + " (" + item.RealFile.Length + " bytes)" : "") + "\n" +
                "Integrity enabled: " + (item.FileChunkSize > 0 ? "Yes" : "No") + "\n" +
                (item.FileChunkSize > 0 ? "Integrity chunk size: " + item.FileChunkSize + " bytes" : "");
    }

    public bool CanGoBack()
    {
        return CurrDir != null && CurrDir.Parent != null;
    }


    public void GetDiskUsage(AesFile[] selectedFiles, Action<int, long> updateUsage)
    {
        Task.Run(() =>
        {
            int items = 0;
            long size = 0;
            GetDiskUsage(selectedFiles, updateUsage, ref items, ref size);
        });
    }

    private long GetDiskUsage(AesFile[] selectedFiles, Action<int, long> updateUsage,
                                     ref int totalItems, ref long totalSize)
    {
        foreach (AesFile file in selectedFiles)
        {
            totalItems++;
            if (file.IsFile)
            {
                totalSize += file.RealFile.Length;
            }
            else
            {
                GetDiskUsage(file.ListFiles(), updateUsage, ref totalItems, ref totalSize);
            }
            if (updateUsage != null)
                updateUsage(totalItems, totalSize);
        }
        if (updateUsage != null)
            updateUsage(totalItems, totalSize);
        return totalSize;
    }
}