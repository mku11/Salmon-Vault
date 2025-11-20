You should be able to build the Salmon Vault apps on Windows 10/11, Linux, and macOS  
If you're working on Windows make sure you ignore the unix file permission by setting filemode in your .git/conf:  
```
filemode = false
```

Before building you need to get the dependencies and gitmodules:
```
cd scripts
./init_gitmodules.bat
```

If you want to run the web vault app you will need to get the dependencies:
```
cd js\project
getdeps.bat
```

If you have unix shell scripts update the index with the correct permissions before committing.
You can use either a linux distro or WSL, cygwin will not work.
```
git update-index --chmod=+x
```

To do this for all scripts under the repo:
```
find . -name "*.sh" -exec git update-index --chmod=+x {} \;
find . -name "gradlew" -exec git update-index --chmod=+x {} \;
```

Also change to LF for all unix scripts:
```
find . -name "*.sh" -exec dos2unix {} \;
find . -name "gradlew" -exec dos2unix {} \;
```

To refresh a branch from the remote repo:
```
git pull origin wip-3.0.0
```