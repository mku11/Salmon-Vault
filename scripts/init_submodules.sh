#!/bin/bash -x
CURRDIR=$(pwd)

# get submodules
git submodule update --recursive --init

cd $CURRDIR