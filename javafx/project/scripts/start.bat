@echo off

set SALMON_CLASS_PATH="./*;./libs/*;./salmon/*"
set JAVAFX_MODULES=--add-modules=javafx.controls,javafx.swing,javafx.fxml,javafx.media,javafx.graphics,javafx.web
set JAVAFX_DIR=.\javafx
set MAIN_CLASS=com.mku.salmon.vault.main.Main
java -Djava.library.path="." --module-path %JAVAFX_DIR%\lib %JAVAFX_MODULES% -cp %SALMON_CLASS_PATH% %MAIN_CLASS%