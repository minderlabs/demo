#!/usr/bin/env bash

#
# Tests the server locally.
#

webpack
webpack --config webpack-server.config.js

./scripts/create_package_file.py dist/package.json

docker build -t minder-app-server .

docker rm -f minder-app-server

docker run -d -p 3000:3000 --name minder-app-server minder-app-server

docker logs minder-app-server

curl "$(docker-machine ip dev):3000/status"
