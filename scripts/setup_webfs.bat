@echo ON
set CURRDIR=%CD%

set WEBFS_VERSION=1.0.0

cd ..\libs\WebFS\project &^
gradlew.bat bootWar &^
cd webfs-service &^
call package.bat &^
cd ..\..\output\webfs-service\webfs-service-%WEBF_VERSION%\config &^
cd %CURRDIR%