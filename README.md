# Salmon Vault
Secure all your personal files in Salmon Vault with AES-256 encryption.  
Encrypt your passwords, text, images, audio, video, pdf, and other files in Salmon Vault.
Salmon Vault works on Android, Windows, Linux, MacOS, and most popular browsers (limited features). Powered by [Salmon-AES-CTR](https://github.com/mku11/Salmon-AES-CTR) encryption library.

[![License: MIT](https://img.shields.io/github/license/mku11/Salmon-Vault.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-blue)](https://mku11.github.io/Salmon-Vault/downloads.html)
[![GitHub Releases](https://img.shields.io/github/downloads/mku11/Salmon-Vault/latest/total?logo=github)](https://github.com/mku11/Salmon-Vault/releases)


## Features
* Create portable encrypted virtual drives.
* Built-in file manager (import, export, rename, copy, move, search).
* Built-in Text Editor for editing encrypted text files.
* Built-in Image Viewer for encrypted images (JPG, PNG, BMP).
* Built-in Media Player for encrypted audio and video.
* Built-in PDF Viewer (WPF, JavaFx only)
* Support for remote readonly drives with HTTPS.
* Support for remote read/write drives with Salmon Web Service.
* Support for Salmon Win protected nonce sequencer service (Win 10+ only).
* File sharing and editing with external apps and easy re-import.
* Authorized devices that can import new files.
* No birthday problem unlike other encryption software.
* Back up your drives as often as you wish.
* AES-256 CTR Mode with HMAC-256 integrity (authentication).
* AES CPU acceleration (Android, Windows, Linux, MacOS)
* AES GPU acceleration (Windows, Linux, MacOS)

## Platforms
Salmon Vault app is offered on several different platforms:  
* JavaFx for Windows x86_64, MacOS x86_64, and Linux x86_64  
* .NET WPF (Windows 10+ Only)  
* Android 23+ ARM 64bit  
* Web app (Chrome also supports local read-write drives)  
* .NET Android 23+ (deprecated)  
* .NET MAUI (Android/Windows 10+ deprecated)  

[**Downloads**](https://mku11.github.io/Salmon-Vault/downloads.html)

![alt text](https://github.com/mku11/Salmon-Vault/blob/main/screenshots/Screenshot.png)  
[**Live Web Demo**](https://mku11.github.io/Salmon-Vault/demo.html)    
Demo Vault contents are licensed under [Content License](https://mku11.github.io/Salmon-Vault/vault/content_license.txt) Copyright by Blender Foundation | www.bigbuckbunny.org  

## Specifications
* AES-256 encryption 
* HMAC SHA-256 authentication.
* SHA-256 Text password key derivation.
* Fast hardware encryption with Salmon AES-NI native subroutines.
* Fallback encryption with TinyAES.
* Protected nonce sequencer (Android only).
* Protected nonce sequencer with SHA256 checksum anti-tampering (Windows only).
* Protected account sequencer service (Optional / Windows only).

---

### Limitations
* Importing files to a salmon virtual drive using different devices requires authorization by an already authorized device for each  virtual drive. The device that created the drive is by default authorized. The authorization mechanism protects against repeated access based attacks!
* Make sure that you never backup and restore the Nonce Sequencer files in your device. This is really important to prevent nonce reuse! For Windows the files are located under %LOCALAPPDATA%\\.salmon directory, for Linux and MacOS under the $HOME/.salmon directory. For Android they are under a no backup folder so they are safe.
* User Sequencer files are not secure from other apps. The sequencer file for Android is secure located in app private space but not for Android rooted devices! For Windows Salmon will notify you if it detects tampering though it is recommended for additional security that you use the Salmon Windows Service. The Windows Service protects the sequencer files under the system administrator (LocalSystem) space. For Linux and Mac make sure you do not share your account with other users!
* Integrity is not supported for filenames only for file contents.
* Maximum guaranteed file size: 2^64 bytes or limited by the backed resource (disk, memory, network).
* Maximum drive file size: 2^64 bytes
* Maximum number of drive files: 2^62 (64 bit nonces used for the filename and the file contents.

### Contributions
Unfortunately code contributions cannot be accepted but you can always fork and sync with this repo. Bug reports and security POCs are more than welcome!  
  
### License
Salmon Vault is released under MIT Licence, see [LICENSE](https://github.com/mku11/Salmon-Vault/blob/main/LICENSE) file.
Make sure you read the LICENSE file and display proper attribution if you decide to use this software.
Dependency libraries from Github, Maven, and NuGet are covered by their own license  
see [NOTICE](https://github.com/mku11/Salmon-Vault/blob/main/NOTICE)  
