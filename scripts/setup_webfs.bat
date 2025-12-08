@echo ON
set CURRDIR=%CD%

cd ..\libs\WebFS\project &^
gradlew.bat bootWar &^
cd webfs-service &^
call package.bat &^
cd ..\..\output\webfs-service\webfs-service-1.0.0\config &^
cd %CURRDIR%