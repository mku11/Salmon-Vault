CURRDIR=$(pwd)

cd scripts

./init_submodules.sh
./get_salmon_libs.sh
./get_js_deps.sh

cd $CURRDIR