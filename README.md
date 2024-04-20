![alt text](https://github.com/mku11/Salmon-Vault/blob/wip/common/common-res/icons/logo.png)

# Salmon Vault
Secure all your personal files in Salmon Vault with AES-256 encryption. Salmon Vault works on Android, Windows, Linux, and MacOS devices. Powered by [Salmon](https://github.com/mku11/Salmon-AES-CTR) encryption library.

[![License: MIT](https://img.shields.io/github/license/mku11/Salmon-Vault.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/mku11/Salmon-Vault/releases)
[![GitHub Releases](https://img.shields.io/github/downloads/mku11/Salmon-Vault/latest/total?logo=github)](https://github.com/mku11/Salmon-Vault/releases)

## Features
* Create portable virtual drives encrypted with a text password.
* Files can be decrypted by any devices running Salmon Vault.
* Files can be imported from any authorized device.
* Built-in Text Editor for editing encrypted text files.
* Image Viewer for encrypted images (JPG, PNG, BMP).
* Multimedia playback for encrypted audio and video.
* Allow file editing with external Apps (Android only).
* No birthday problem unlike other encryption software.
* Back up your drives as often as you wish.

## Specs
* AES-256 encryption 
* HMAC SHA-256 authentication.
* SHA-256 Text password key derivation.
* Fast hardware encryption with Salmon AES-NI native subroutines.
* Fallback encryption with TinyAES.
* Protected nonce sequencer (Android only).
* Protected nonce sequencer with SHA256 checksum anti-tampering (Windows only).
* Protected account sequencer service (Optional / Windows only).

## Applications
Salmon Vault app is offered on several different platforms:  
* JavaFx for Windows x86_64, MacOS x86_64, and Linux x86_64/ARM64
* .NET WPF (Windows Only)
* Android 23+
* .NET Android 23+
* .NET MAUI (Android/Windows 10+ experimental)
* Javascript Web App (Chrome, Firefox, Safari support remote drives, Chrome supports also local drives)

[**Live Web Demo**](https://mku11.github.io/Salmon-AES-CTR/demo)

[**Downloads**](https://github.com/mku11/Salmon-Vault/releases)

---

### Limitations
* Importing files to a salmon virtual drive using different devices requires authorization by an already authorized device for each  virtual drive. The device that created the drive is by default authorized. The authorization mechanism protects against repeated access based attacks!
* Make sure that you never backup and restore the Nonce Sequencer files in your Windows Device! For Windows the files are located under %LOCALAPPDATA%\\.salmon directory, for Android and Linux under the $HOME/.salmon directory. Also you need to make sure you exclude them from backups and restores, this will prevent nonce reuse!
* User Sequencer files are not secure from other apps. The sequencer file for Android is secure located in private space but not for rooted devices! For windows Salmon will notify you if it detects tampering though it is recommended for additional security that you should use the Salmon Windows Service. The Salmon service protects the sequencer files under the system administrator (LocalSystem) space. For Linux and Mac make sure you do not share your account with other users! 
* Integrity is not supported for filenames only for file contents.
* Maximum guaranteed file size: 2^64 bytes or limited by the backed resource (disk, memory, network).
* Maximum drive file size: 2^64 bytes
* Maximum number of drive files: 2^62 (64 bit nonces used for the filename and the file contents.

### Contributions
Unfortunately I cannot accept any code contributions. Though, bug reports and security POCs are more than welcome!  
  
### License
Salmon is released under MIT Licence, see [LICENSE](https://github.com/mku11/Salmon-Vault/blob/main/LICENSE) file.
Make sure you read the LICENSE file and display proper attribution if you decide to use this software.
Dependency libraries from Github, Maven, and NuGet are covered by their own license  
see [NOTICE](https://github.com/mku11/Salmon-Vault/blob/main/LICENSE)  
