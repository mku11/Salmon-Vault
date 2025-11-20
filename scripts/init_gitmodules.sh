#!/bin/bash -x
CURRDIR=$(pwd)

# get submodules
git submodule update --recursive --init

# get specific versions
cd $CURRDIR/../deps/jbind
cp -rf src/* ../js/src/assets/js/lib/jbind

cd $CURRDIR/../deps/jwin
cp -rf src/* ../js/src/assets/js/lib/jbind

# uncomment to copy the web gpu logger if you're debugging
# cd $CURRDIR/../deps/WebGPULogger
# cp -rf src/* ../js/src/assets/js/lib/webgpu-logger

cd $CURRDIR