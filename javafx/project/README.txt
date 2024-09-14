Salmon Vault - JavaFx
version: 2.1.1
project: https://github.com/mku11/Salmon-AES-CTR
license: MIT License https://github.com/mku11/Salmon-AES-CTR/blob/main/LICENSE

Run:
Make sure you have Java and JavaFX installed on your machine you can download it from:
https://openjfx.io/
Set environment variable JAVAFX_HOME to the path that JavaFx is installed in your machine.
If you use windows you can set the variable in the start.bat script or start.sh for MacOS and linux.
For mac and linux users you will need to provide executable permissions to start.sh on the command line:
chmod u+x start.sh
Then run start.sh to start Salmon Vault

Open source projects included:
TinyAES
project: https://github.com/kokke/tiny-AES-c
license: The Unlicense https://github.com/kokke/tiny-AES-c/blob/master/unlicense.txt

Java Native Access
project: https://github.com/java-native-access/jna
license: Apache-2.0 https://github.com/java-native-access/jna/blob/master/LICENSE

JavaFX
project: https://github.com/openjdk/jfx
license: GPLv2.0 https://github.com/openjdk/jfx/blob/master/LICENSE

Build
To build the app you will need:  
1. Intellij IDEA.
2. Gradle

Run the build task from gradle instead of the Intellij IDEA. This will include the native library.
Alternatively you can build from the command line:
gradlew.bat build -x test --rerun-tasks

To refresh development packages make sure you delete the salmon packages in the cache:
C:\Users\<username>\.gradle\caches\modules-2\files-2.1\com.mku.salmon.*
Then refresh the gradle dependencies from the IDE or from command line:
gradlew.bat --refresh-dependencies

To run/debug the app from within the IDE open gradle tab and run the task "runApp" under Application. This will ensure that the salmon native library is loaded.

Package:
To package the app build the artifacts from Intellij IDEA.

Native library support:
If you need to build with AES intrinsics for a different cpu architecture you need to place the native libraries under libs folder.
For more details open each artifact and view the required files.
