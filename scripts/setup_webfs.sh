CURRDIR=$(pwd)

cd ../libs/WebFS/project
./gradlew bootWar
cd webfs-service
./package.sh
cd ../../output/webfs-service/webfs-service-1.0.0/config

cd $CURRDIR