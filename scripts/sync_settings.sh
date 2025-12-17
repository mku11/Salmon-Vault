#!/bin/bash -x
CURRDIR=$(pwd)

# Unix format
echo Changing scripts format
find ../ -name "*.sh" -not -path "*/node_modules/*" -not -path "*/deps/*" -exec dos2unix {} \;
find ../ -name "gradlew" -not -path "*/node_modules/*" -not -path "*/deps/*" -exec dos2unix {} \;

dos2unix $CURRDIR/settings.cfg
source $CURRDIR/settings.cfg

echo Synchronizing project settings
echo SALMON_VAULT_VERSION: $SALMON_VAULT_VERSION
echo SALMON_VAULT_APP_VERSION: $SALMON_VAULT_APP_VERSION
echo SALMON_VERSION: $SALMON_VERSION

# PROJECTS
echo
echo Syncing Projects
echo WPF

PATTERN="<SalmonVersion>[^/]*<\/SalmonVersion>"
SUBST="<SalmonVersion>$SALMON_VERSION<\/SalmonVersion>"
DIR=../wpf/project/Salmon.Vault.WPF
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.WPF.csproj

PATTERN="<Version>[^/]*<\/Version>"
SUBST="<Version>$SALMON_VAULT_VERSION<\/Version>"
DIR=../wpf/project/Salmon.Vault.WPF
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.WPF.csproj

echo
echo JavaFx

PATTERN="^version '[^/]*'"
SUBST="version '$SALMON_VAULT_VERSION'"
DIR=../javafx/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/build.gradle

PATTERN="salmonLibVersion = '[^/]*'"
SUBST="salmonLibVersion = '$SALMON_VERSION'"
DIR=../javafx/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/build.gradle

PATTERN="Implementation-Version: [^/]*"
SUBST="Implementation-Version: $SALMON_VAULT_VERSION"
DIR=../javafx/project/src/main/resources/META-INF
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/MANIFEST.MF

echo
echo Android

PATTERN="salmonLibVersion = '[^/]*'"
SUBST="salmonLibVersion = '$SALMON_VERSION'"
DIR=../android/project/app
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/build.gradle

PATTERN="android:versionCode=\"[^/]*\""
SUBST="android:versionCode=\"$SALMON_VAULT_APP_VERSION\""
DIR=../android/project/app/src/main
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

PATTERN="android:versionName=\"[^/]*\""
SUBST="android:versionName=\"$SALMON_VAULT_VERSION\""
DIR=../android/project/app/src/main
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

echo
echo .NET Android

PATTERN="<ApplicationVersion>[^/]*<\/ApplicationVersion>"
SUBST="<ApplicationVersion>$SALMON_VAULT_APP_VERSION<\/ApplicationVersion>"
DIR=../dotnet-android/project/Salmon.Vault.Net.Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.DotNetAndroid.csproj

PATTERN="<ApplicationDisplayVersion>[^/]*<\/ApplicationDisplayVersion>"
SUBST="<ApplicationDisplayVersion>$SALMON_VAULT_VERSION<\/ApplicationDisplayVersion>"
DIR=../dotnet-android/project/Salmon.Vault.Net.Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.DotNetAndroid.csproj

PATTERN="<SalmonVersion>[^/]*<\/SalmonVersion>"
SUBST="<SalmonVersion>$SALMON_VERSION<\/SalmonVersion>"
DIR=../dotnet-android/project/Salmon.Vault.Net.Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.DotNetAndroid.csproj

PATTERN="android:versionCode=\"[^/]*\""
SUBST="android:versionCode=\"$SALMON_VAULT_APP_VERSION\""
DIR=../dotnet-android/project/Salmon.Vault.NET.Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

PATTERN="android:versionName=\"[^/]*\""
SUBST="android:versionName=\"$SALMON_VAULT_VERSION\""
DIR=../dotnet-android/project/Salmon.Vault.NET.Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

echo
echo MAUI

PATTERN="<ApplicationVersion>[^/]*<\/ApplicationVersion>"
SUBST="<ApplicationVersion>$SALMON_VAULT_APP_VERSION<\/ApplicationVersion>"
DIR=../maui/project/SalmonMAUI
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.MAUI.csproj

PATTERN="<ApplicationDisplayVersion>[^/]*<\/ApplicationDisplayVersion>"
SUBST="<ApplicationDisplayVersion>$SALMON_VAULT_VERSION<\/ApplicationDisplayVersion>"
DIR=../maui/project/SalmonMAUI
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.MAUI.csproj

PATTERN="<SalmonVersion>[^/]*<\/SalmonVersion>"
SUBST="<SalmonVersion>$SALMON_VERSION<\/SalmonVersion>"
DIR=../maui/project/SalmonMAUI
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Salmon.Vault.MAUI.csproj

PATTERN="android:versionCode=\"[^/]*\""
SUBST="android:versionCode=\"$SALMON_VAULT_APP_VERSION\""
DIR=../maui/project/SalmonMAUI/Platforms/Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

PATTERN="android:versionName=\"[^/]*\""
SUBST="android:versionName=\"$SALMON_VAULT_VERSION\""
DIR=../maui/project/SalmonMAUI/Platforms/Android
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/AndroidManifest.xml

PATTERN=" Version=\"[^/]*\.0\""
SUBST=" Version=\"$SALMON_VAULT_VERSION\.0"
DIR=../maui/project/SalmonMAUI/Platforms/Windows
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/Package.appxmanifest

echo
echo JavaScript

PATTERN="static VERSION = \"[^/]*\";"
SUBST="static VERSION = \"$SALMON_VAULT_VERSION\";"
DIR=../js/src/assets/js/vault/config
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/salmon_config.js

# README
echo
echo Syncing README

PATTERN="^version:[^/]*"
SUBST="version: $SALMON_VAULT_VERSION"
DIR=../javafx/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/README.txt

PATTERN="^version:[^/]*"
SUBST="version: $SALMON_VAULT_VERSION"
DIR=../js/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/readme.txt

PATTERN="^version:[^/]*"
SUBST="version: $SALMON_VAULT_VERSION"
DIR=../wpf/project/Salmon.Vault.WPF
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/README.txt

PATTERN="^version:[^/]*"
SUBST="version: $SALMON_VAULT_VERSION"
DIR=../android/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/README.txt

# SCRIPTS
echo
echo Syncing Scripts
PATTERN="^VERSION=[^/]*"
SUBST="VERSION=$SALMON_VAULT_VERSION"
DIR=../javafx/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/package.sh

PATTERN="^set VERSION=[^/]*"
SUBST="set VERSION=$SALMON_VAULT_VERSION"
DIR=../javafx/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/package.bat

PATTERN="^VERSION=[^/]*"
SUBST="VERSION=$SALMON_VAULT_VERSION"
DIR=../js/project
sed -i -e "s/$PATTERN/$SUBST/g" $DIR/package.sh

