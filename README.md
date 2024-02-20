![alt text](https://github.com/mku11/Salmon-AES-CTR/blob/wip/common/common-res/icons/logo.png)

# Salmon Vault
Secure all your personal files in Salmon Vault with AES-256 encryption for your Android, Windows, Linux, MacOS devices. 
Powered by Salmon AES CTR library.

[![License: MIT](https://img.shields.io/github/license/mku11/Salmon-Vault.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.5-blue)](https://github.com/mku11/Salmon-Vault/releases)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/mku11/Salmon-Vault)](https://github.com/mku11/Salmon-Vault/commits/master)
[![CodeFactor](https://www.codefactor.io/repository/github/mku11/salmon-Vault/badge)](https://www.codefactor.io/repository/github/mku11/salmon-Vault)
<!-- [![GitHub Releases](https://img.shields.io/github/downloads/mku11/Salmon-Vault/latest/total?logo=github)](https://github.com/mku11/Salmon-Vault/releases) -->

## Features
* Create portable file drives locked with a text password.
* Drives are portable and can be decrypted with any device.
* Unlike other solutions with Salmon there is no birthday problem.
* Back up your drives as often as you wish.
* Devices can be authorized to import new files.
* Encrypted multimedia playback for audio and video.
* Built-in Text Editor for editing encrypting text files.
* Allow editing with external Apps (Android only).

## Specs
* AES-256 CTR Mode encryption with HMAC SHA-256 integrity.
* SHA-256 Text password key derivation.
* Fast hardware AES-NI encryption.
* Protected nonce sequencer (Android only)
* Protected nonce sequencer with SHA256 checksum anti-tampering (Windows only)
* Protected account sequencer service (Windows only).

## Applications
Salmon Vault app is offered on several different platforms:  
* Java with JavaFx for Windows, MacOS, and Linux
* .NET with WPF/MAUI for Windows, MacOS, Android
* Native Android
* Android .NET

[**Downloads**](https://github.com/mku11/Salmon-AES-CTR/releases)

---

### Limitations
* Importing files to a salmon virtual drive using different devices requires authorization by an already authorized device for each  virtual drive. The device that created the drive is by default authorized. The authorization mechanism protects against repeated access based attacks!
* Make sure that you never backup and restore the Nonce Sequencer files in your Windows Device! They are located in each user %LOCALAPPDATA%\\.salmon directory (including the LocalSystem user if you use the Salmon Windows Service). So make sure you exclude them from backups and restores.
* The Windows user sequencer files are not secure from other apps! Also do not share your device account with other users! Salmon will attempt to notify you if it encounters tampering on the sequencer though for additional security you should use the Salmon Windows Service which protects the sequencer under the LocalSystem space.
* Integrity is not supported for filenames only for file contents.

### Contributions
Code contributions are not accepted.  
Bug reports and security POCs are more than welcome!  
  
### License
Salmon is released under MIT Licence, see [LICENSE](https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE) file.
Make sure you read the LICENSE file and display proper attribution if you decide to use this software.
Dependency libraries from Github, Maven, and NuGet are covered by their own license  
see [NOTICE](https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE)  
