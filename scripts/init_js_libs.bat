@ECHO ON
set CURRDIR=%CD%

:: Salmon Libs
set SIMPLE_IO_VERSION=1.0.2
set SIMPLE_FS_VERSION=1.0.2
set SALMON_LIB_VERSION=3.0.4

set SIMPLE_IO=simple-io
set SIMPLE_FS=simple-fs
set SALMON_CORE=salmon-core
set SALMON_FS=salmon-fs

set SALMON_LIB=..\libs\salmon\salmon-javascript
set SIMPLE_IO_LIB=%SALMON_LIB%\%SIMPLE_IO%.js.%SIMPLE_IO_VERSION%
set SIMPLE_FS_LIB=%SALMON_LIB%\%SIMPLE_FS%.js.%SIMPLE_FS_VERSION%
set SALMON_CORE_LIB=%SALMON_LIB%\%SALMON_CORE%.js.%SALMON_LIB_VERSION%
set SALMON_FS_LIB=%SALMON_LIB%\%SALMON_FS%.js.%SALMON_LIB_VERSION%

xcopy /E /Y /I %SIMPLE_IO_LIB% ..\js\src\assets\js\lib\
xcopy /E /Y /I %SIMPLE_FS_LIB% ..\js\src\assets\js\lib\
xcopy /E /Y /I %SALMON_CORE_LIB% ..\js\src\assets\js\lib\
xcopy /E /Y /I %SALMON_FS_LIB% ..\js\src\assets\js\lib\

:: JavaScript libs
cd %CURRDIR%\..\libs\jbind
xcopy /E /Y /I src ..\..\js\src\assets\js\lib\jbind

cd %CURRDIR%\..\libs\jwin
xcopy /E /Y /I src ..\..\js\src\assets\js\lib\jwin

:: uncomment to copy the web gpu logger if you're debugging
REM cd %CURRDIR%\..\libs\WebGPULogger
REM xcopy /E /Y /I *.js ..\..\js\src\assets\js\lib\webgpu-logger

cd %CURRDIR%