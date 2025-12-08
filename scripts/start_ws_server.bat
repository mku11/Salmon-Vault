@echo ON
set CURRDIR=%CD%

set WEBFS_VERSION=1.0.0

cd %CURRDIR%\..\libs\WebFS\output\webfs-service\webfs-service-%WEBFS_VERSION% &^
start-webfs-service.bat &^
cd %CURRDIR%