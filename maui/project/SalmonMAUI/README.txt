Salmon Vault - MAUI
version: 3.0.0
project: https://github.com/mku11/Salmon-AES-CTR
license: MIT License https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE

Open source projects included:
TinyAES
project: https://github.com/kokke/tiny-AES-c
license: The Unlicense https://github.com/kokke/tiny-AES-c/blob/master/unlicense.txt

webview2
project: https://learn.microsoft.com/en-us/microsoft-edge/webview2/
license: https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.2088.41/license

MimeTypesMap
project: https://github.com/hey-red/MimeTypesMap
license: MIT License: https://github.com/hey-red/MimeTypesMap/blob/master/LICENSE

Xamarin AndroidX Bindings
project: https://github.com/xamarin/AndroidX
license: MIT License https://github.com/xamarin/AndroidX/blob/main/LICENSE.md

NOTE:
The MAUI .NET Salmon Vault app is deprecated and might not be maintained in the future.
Use the WPF for Windows and Android .NET Salmon Vault apps instead.

Build
To build the app you will need:  
1. Microsoft Visual Studio 2022  
2. .Net Multi-platform App UI development (part of the Visual Studio installer)   

Package:
To package the app click on Build/Publish in Visual Studio.

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