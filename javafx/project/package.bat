@echo ON
set VERSION=3.0.1

:: Salmon Vault javascript
set OUTPUT_ROOT=..\..\output
set OUTPUT_DIR=%OUTPUT_ROOT%\javafx
set SALMON_VAULT_JAR=.\build\libs\salmon-vault-%VERSION%.jar
set SALMON_LIBS_DIR=.\libs\salmon
set JAVAFX_LIBS_DIR=.\libs\javafx
set DEPS_LIBS_DIR=.\libs\libs
set SALMON_NATIVE_LIBS_DIR=.\build\libs\natives\lib
set SALMON_SCRIPTS_DIR=.\scripts

set PACKAGES_DIR=app_package
set SALMON_VAULT=salmon-vault-javafx
set SALMON_VAULT_PACKAGE_NAME=%SALMON_VAULT%.%VERSION%

powershell mkdir -ErrorAction SilentlyContinue %PACKAGES_DIR%
del /S /Q .\%PACKAGES_DIR%\*

powershell mkdir -ErrorAction SilentlyContinue %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%
del /S /Q .\%PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\*

robocopy /E %SALMON_LIBS_DIR%\ %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
copy %SALMON_VAULT_JAR% %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
robocopy /E %JAVAFX_LIBS_DIR%\ %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\javafx\
robocopy /E %DEPS_LIBS_DIR%\ %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\libs\
copy %SALMON_NATIVE_LIBS_DIR%\*.dll %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
copy %SALMON_NATIVE_LIBS_DIR%\*.so %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
copy %SALMON_NATIVE_LIBS_DIR%\*.dylib %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
copy %SALMON_NATIVE_LIBS_DIR%\*.dll %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\salmon\
copy %SALMON_SCRIPTS_DIR%\* %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\
copy README.txt %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%\

cd %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%
powershell -command Compress-Archive -Force -DestinationPath ..\%SALMON_VAULT_PACKAGE_NAME%.zip *
cd ..\..\
powershell mkdir -ErrorAction SilentlyContinue %OUTPUT_DIR%
copy /Y %PACKAGES_DIR%\%SALMON_VAULT_PACKAGE_NAME%.zip %OUTPUT_DIR%

