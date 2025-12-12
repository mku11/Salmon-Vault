@echo ON
set CURRDIR=%CD%

set VERSION=3.0.1

:: Salmon Vault javascript
set OUTPUT_ROOT=%CURRDIR%\..\..\..\output
set OUTPUT_DIR=%OUTPUT_ROOT%\wpf

set PACKAGES_DIR=%CURRDIR%\app_package\salmon-vault-wpf
set SALMON_VAULT_PACKAGE=%PACKAGES_DIR%.%VERSION%

cd %PACKAGES_DIR%
powershell -command Compress-Archive -Force -DestinationPath %SALMON_VAULT_PACKAGE%.zip *

powershell mkdir -ErrorAction SilentlyContinue %OUTPUT_DIR%
copy /Y %SALMON_VAULT_PACKAGE%.zip %OUTPUT_DIR%

cd %CURRDIR%