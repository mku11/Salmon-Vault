@ECHO ON
set CURRDIR=%CD%

:: get submodules
git submodule update --recursive --init

:: get specific versions
cd %CURRDIR%\..\deps\jbind
xcopy /E /Y /I src ..\..\js\src\assets\js\lib\jbind

cd %CURRDIR%\..\deps\jwin
xcopy /E /Y /I src ..\..\js\src\assets\js\lib\jwin

:: uncomment to copy the web gpu logger if you're debugging
cd %CURRDIR%\..\deps\WebGPULogger
xcopy /E /Y /I *.js ..\..\js\src\assets\js\lib\webgpu-logger

cd %CURRDIR%