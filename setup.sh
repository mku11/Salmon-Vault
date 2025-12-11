CURRDIR=$(pwd)

cd scripts

./init_submodules.sh
./get_salmon_libs.sh
./init_js_libs.sh

cd $CURRDIR