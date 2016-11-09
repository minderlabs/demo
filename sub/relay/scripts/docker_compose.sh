#!/bin/sh

#
# Run and test before commit to master branch.
#

docker-compose build

docker-compose up --force-recreate --remove-orphans

# TODO(burdon): Test version.
# curl $(docker-machine ip dev):3000/status
