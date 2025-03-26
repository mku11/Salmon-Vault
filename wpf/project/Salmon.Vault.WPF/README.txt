Salmon Vault - WPF
version: 2.1.1
project: https://github.com/mku11/Salmon-AES-CTR
license: MIT License https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE

Open source projects included:

ffmediaelement
project: https://github.com/unosquare/ffmediaelement
license: Microsoft Public License (Ms-PL) https://github.com/unosquare/ffmediaelement/blob/master/LICENSE

MimeTypesMap
project: https://github.com/hey-red/MimeTypesMap
license: MIT License: https://github.com/hey-red/MimeTypesMap/blob/master/LICENSE

webview2
project: https://learn.microsoft.com/en-us/microsoft-edge/webview2/
license: https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.2088.41/license

Build
To build the app you will need:  
1. Microsoft Visual Studio 2022  

Restore packages:
msbuild -restore

Restore dev packages (if changed):
delete files from C:\Users\<username>\.nuget\packages
msbuild -t:restore

To clean:
msbuild -t:clean

To build from the command line:
msbuild

Package:
To package the app click on Build/Publish in Visual Studio.
or type in the command prompt:
msbuild /t:publish /p:PublishProfile=Properties\PublishProfiles\FolderProfile.pubxml /p:Configuration=Release

Video Playback with ffmpeg (Optional):
If you want to play encrypted media with ffmpeg you will need to download ffmpeg from here:
https://github.com/BtbN/FFmpeg-Builds/releases
Make sure you download version 4.4: ffmpeg-n4.4-latest-win64-gpl-shared-4.4.zip
unzip the contents of the bin/ folder from inside the zip file into folder: c:\ffmpeg\x64
