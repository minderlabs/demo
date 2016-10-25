#
# Copyright 2016 Alien Laboratories, Inc.
#
# Test Node Server Dockerfile
# alienlaboratories/react-demos
#

#
# Base node image.
# https://github.com/nodejs/docker-node
# https://nodejs.org/en/docs/guides/nodejs-docker-webapp
#

FROM node:onbuild

#
# Environment.
#

ENV HOME=/home/nx
ENV NPM_CONFIG_LOGLEVEL=warn

#
# Create the nx user and home directory.
# https://docs.docker.com/articles/dockerfile_best-practices/#user
# http://stackoverflow.com/questions/24308760/running-app-inside-docker-as-non-root-user
#

RUN groupadd -r nx && useradd -r -g nx nx
RUN mkdir -p $HOME
RUN chown -R nx:nx $HOME

#
# Add sources.
#

ADD package.json              $HOME/app/package.json
ADD package-dev.json          $HOME/app/package-dev.json
ADD webpack-base.config.js    $HOME/app/webpack-base.config.js
ADD webpack-node.config.js    $HOME/app/webpack-node.config.js
ADD webpack.config.js         $HOME/app/webpack.config.js
ADD js                        $HOME/app/js
ADD scripts                   $HOME/app/scripts
ADD tools                     $HOME/app/tools

#
# Install deps.
# https://github.com/nodejs/docker-node#verbosity
# NOTE: logging set to info otherwise could miss errors.
#

WORKDIR $HOME/app

RUN python scripts/create_package_file.py package.json

RUN npm install -g babel-cli
RUN npm install -g webpack

RUN npm install

#
# Build artifacts
#

RUN npm run update-schema
RUN npm run webpack-client
RUN npm run webpack-server

#
# Exposed port for nginx-proxy (matches docker-compose.yml and docker cloud stackfile).
#

EXPOSE 8080

#
# Switch to user.
#

USER nx

#
# Startup.
# TODO(burdon): Logging.
#

CMD [ "npm", "start" ]
