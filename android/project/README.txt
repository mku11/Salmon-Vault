Salmon Vault - Android
version: 2.0.0
project: https://github.com/mku11/Salmon-AES-CTR
license: MIT License https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE

Open source projects included:
Salmon-AES-CTR
license: MIT License
project: https://github.com/mku11/Salmon-AES-CTR

uxwing icons
Home: https://uxwing.com

Build:
To build the app you will need:
1. Android Studio

If you're in development and the snapshot dependencies have changed make sure you refresh:
./gradlew --refresh-dependencies

Optional:  
If you want to include the fast AES intrinsics and Tiny AES:
uncomment line in app/build.gradle:
implementation 'com.mku.salmon:salmon-android-native:x.x.x'

Package:
From Android Studio menu bar click on Build / Generate Signed Bundle/APK

Notes:
If you get a transform error with the dependencies make sure you right click
on Gradle window in Android Studio and select Refresh Gradle Dependencies