@ECHO ON
set CURRDIR=%CD%

cd scripts &^
init_submodules.bat &^
get_salmon_libs.bat &^
get_js_deps.bat &^
cd %CURRDIR%