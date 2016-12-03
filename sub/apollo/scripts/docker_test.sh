#!/usr/bin/env bash

#
# Tests the server locally.
#

webpack
webpack --config webpack-server.config.js

./scripts/create_package_file.py dist/package.json

docker build -t node-apollo .

docker rm -f node-apollo

docker run -d -p 3000:3000 --name node-apollo node-apollo

docker logs node-apollo

curl "$(docker-machine ip dev):3000/status"
