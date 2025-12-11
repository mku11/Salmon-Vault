@ECHO ON
set CURRDIR=%CD%

cd scripts &^
init_submodules.bat &^
get_salmon_libs.bat &^
init_js_libs.bat &^
cd %CURRDIR%