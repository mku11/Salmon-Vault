#!/bin/bash -x
CURRDIR=$(pwd)

# get submodules
git submodule update --recursive --init

# get specific versions
cd $CURRDIR/../deps/jbind
mkdir -p ../../js/src/assets/js/lib/jbind
cp -rf src/* ../../js/src/assets/js/lib/jbind

cd $CURRDIR/../deps/jwin
mkdir -p ../../js/src/assets/js/lib/jwin
cp -rf src/* ../../js/src/assets/js/lib/jwin

# uncomment to copy the web gpu logger if you're debugging
# cd $CURRDIR/../deps/WebGPULogger
# mkdir -p ../../js/src/assets/js/lib/webgpu-logger
# cp -rf src/* ../../js/src/assets/js/lib/webgpu-logger

cd $CURRDIR