@ECHO ON
set CURRDIR=%CD%

:: get submodules
git submodule update --recursive --init

cd %CURRDIR%