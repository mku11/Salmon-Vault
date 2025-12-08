set SIMPLE_IO_VERSION=1.0.2
set SIMPLE_FS_VERSION=1.0.2
set SALMON_LIB_VERSION=3.0.2

set SIMPLE_IO=simple-io
set SIMPLE_IO_LIB=%SIMPLE_IO%.js.%SIMPLE_IO_VERSION%
set SIMPLE_IO_LIB_FILENAME=%SIMPLE_IO_LIB%.zip

set SIMPLE_FS=simple-fs
set SIMPLE_FS_LIB=%SIMPLE_FS%.js.%SIMPLE_FS_VERSION%
set SIMPLE_FS_LIB_FILENAME=%SIMPLE_FS_LIB%.zip

set SALMON_CORE=salmon-core
set SALMON_CORE_LIB=%SALMON_CORE%.js.%SALMON_LIB_VERSION%
set SALMON_CORE_LIB_FILENAME=%SALMON_CORE_LIB%.zip

set SALMON_FS=salmon-fs
set SALMON_FS_LIB=%SALMON_FS%.js.%SALMON_LIB_VERSION%
set SALMON_FS_LIB_FILENAME=%SALMON_FS_LIB%.zip

rmdir packages /S /Q
mkdir packages
rmdir ..\src\assets\js\lib\%SIMPLE_IO% /S /Q
rmdir ..\src\assets\js\lib\%SIMPLE_FS% /S /Q
rmdir ..\src\assets\js\lib\%SALMON_CORE% /S /Q
rmdir ..\src\assets\js\lib\%SALMON_FS% /S /Q
mkdir ..\src\assets\js\lib

:: for development use local repository:
set SALMON_LIBS_URL=http://localhost/repository/javascript
:: or official github salmon repository:
:: set SALMON_LIBS_URL=https://github.com/mku11/Salmon-AES-CTR/releases/download/v%SALMON_LIB_VERSION%

set SIMPLE_IO_LIB_URL=%SALMON_LIBS_URL%/%SIMPLE_IO_LIB_FILENAME%
set SIMPLE_FS_LIB_URL=%SALMON_LIBS_URL%/%SIMPLE_FS_LIB_FILENAME%
set SALMON_CORE_LIB_URL=%SALMON_LIBS_URL%/%SALMON_CORE_LIB_FILENAME%
set SALMON_FS_LIB_URL=%SALMON_LIBS_URL%/%SALMON_FS_LIB_FILENAME%

cd packages
curl %SIMPLE_IO_LIB_URL% -LJo %SIMPLE_IO_LIB_FILENAME%
curl %SIMPLE_FS_LIB_URL% -LJo %SIMPLE_FS_LIB_FILENAME%
curl %SALMON_CORE_LIB_URL% -LJo %SALMON_CORE_LIB_FILENAME%
curl %SALMON_FS_LIB_URL% -LJo %SALMON_FS_LIB_FILENAME%

powershell -command Expand-Archive -Force '%SIMPLE_IO_LIB_FILENAME%'
powershell -command Expand-Archive -Force '%SIMPLE_FS_LIB_FILENAME%'
powershell -command Expand-Archive -Force '%SALMON_CORE_LIB_FILENAME%'
powershell -command Expand-Archive -Force '%SALMON_FS_LIB_FILENAME%'

cd ..
move packages\%SIMPLE_IO_LIB%\%SIMPLE_IO% ..\src\assets\js\lib\
move packages\%SIMPLE_FS_LIB%\%SIMPLE_FS% ..\src\assets\js\lib\
move packages\%SALMON_CORE_LIB%\%SALMON_CORE% ..\src\assets\js\lib\
move packages\%SALMON_FS_LIB%\%SALMON_FS% ..\src\assets\js\lib\