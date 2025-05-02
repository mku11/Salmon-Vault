#!/bin/bash

export SALMON_CLASS_PATH="./*;./libs/*;./salmon/*"
export JAVAFX_MODULES=--add-modules=javafx.controls,javafx.swing,javafx.fxml,javafx.media,javafx.graphics
export JAVAFX_DIR=./javafx
export MAIN_CLASS=com.mku.salmon.vault.main.Main
java -Djava.library.path="." --module-path $JAVAFX_DIR/lib $JAVAFX_MODULES -cp $SALMON_CLASS_PATH $MAIN_CLASS

