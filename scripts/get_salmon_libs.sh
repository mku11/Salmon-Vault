#!/bin/bash -x

CURRDIR=$(pwd)

DEPS_DIR=../libs/
SALMON_LIB_VERSION=3.0.5
# if you use a snapshot append -SNAPSHOT to this variable
SALMON_LIB_BINARY_VERSION=$SALMON_LIB_VERSION

SALMON_LIB_BINARY=salmon-multi-arch.v$SALMON_LIB_BINARY_VERSION.zip
SALMON_URL=https://github.com/mku11/Salmon-AES-CTR/releases/download/v$SALMON_LIB_BINARY_VERSION/$SALMON_LIB_BINARY
ZIP_FILENAME=salmon

mkdir -p $DEPS_DIR
curl $SALMON_URL -LJo $DEPS_DIR/$ZIP_FILENAME.zip
cd $DEPS_DIR
mkdir -p $ZIP_FILENAME
cd $ZIP_FILENAME
unzip -qq -o ../$ZIP_FILENAME.zip

# extract the native lib for windows
cd salmon-msvc-win-x86_64
cp -f Salmon.Native.$SALMON_LIB_VERSION.nupkg Salmon.Native.$SALMON_LIB_VERSION.zip
rm -rf Salmon.Native.$SALMON_LIB_VERSION
mkdir -p Salmon.Native.$SALMON_LIB_VERSION
cd Salmon.Native.$SALMON_LIB_VERSION
unzip -qq -o ../Salmon.Native.$SALMON_LIB_VERSION.zip

cd $CURRDIR