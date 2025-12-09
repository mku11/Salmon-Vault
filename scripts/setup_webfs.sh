CURRDIR=$(pwd)

WEBFS_VERSION=1.0.0

cd ../libs/WebFS/project
./gradlew bootWar
cd webfs-service
./package.sh
cd ../../output/webfs-service/webfs-service-$WEBFS_VERSION/config

cd $CURRDIR