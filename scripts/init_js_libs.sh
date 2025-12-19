#!/bin/bash -x

CURRDIR=$(pwd)

# Salmon Libs
SIMPLE_IO_VERSION=1.0.2
SIMPLE_FS_VERSION=1.0.2
SALMON_LIB_VERSION=3.0.4

SIMPLE_IO=simple-io
SIMPLE_FS=simple-fs
SALMON_CORE=salmon-core
SALMON_FS=salmon-fs

SALMON_LIB=../libs/salmon/salmon-javascript
SIMPLE_IO_LIB=$SALMON_LIB/$SIMPLE_IO.js.$SIMPLE_IO_VERSION
SIMPLE_FS_LIB=$SALMON_LIB/$SIMPLE_FS.js.$SIMPLE_FS_VERSION
SALMON_CORE_LIB=$SALMON_LIB/$SALMON_CORE.js.$SALMON_LIB_VERSION
SALMON_FS_LIB=$SALMON_LIB/$SALMON_FS.js.$SALMON_LIB_VERSION

mkdir -p ../js/src/assets/js/lib/

cp -rf $SIMPLE_IO_LIB/* ../js/src/assets/js/lib/
cp -rf $SIMPLE_FS_LIB/* ../js/src/assets/js/lib/
cp -rf $SALMON_CORE_LIB/* ../js/src/assets/js/lib/
cp -rf $SALMON_FS_LIB/* ../js/src/assets/js/lib/

# JavaScript libs
cd $CURRDIR/../libs/jbind
mkdir -p ../../js/src/assets/js/lib/jbind/
cp -rf src/* ../../js/src/assets/js/lib/jbind/

cd $CURRDIR/../libs/jwin
mkdir -p ../../js/src/assets/js/lib/jwin/
cp -rf src/* ../../js/src/assets/js/lib/jwin/

# uncomment to copy the web gpu logger if you're debugging
# cd $CURRDIR/../libs/WebGPULogger
# cp -rf *.js ../../js/src/assets/js/lib/webgpu-logger/

cd $CURRDIR