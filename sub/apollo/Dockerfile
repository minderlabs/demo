#
# Copyright 2016 Minder Labs.
#
# Apollo Demo Server Dockerfile
# alienlaboratories/react-demos
#

#
# Base node image.
# https://github.com/nodejs/docker-node
# https://nodejs.org/en/docs/guides/nodejs-docker-webapp
#

FROM node

#
# Environment.
#

ENV HOME=/home/nx

# Used by nginx-proxy and configures node server.
ENV VIRTUAL_PORT=3000

ENV NODE_ENV=production

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

# TODO(burdon): Set-up for Jenkins local build.
# TODO(burdon): Currently just add all unbuilt assets.

ADD dist                  $HOME/app/dist
ADD dist/package.json     $HOME/app/package.json

# TODO(burdon): Either bundle server or configure base directory.

ADD src/server            $HOME/app/src/server

#ADD src/server/public     $HOME/app/dist/public
#ADD src/server/testing    $HOME/app/dist/testing
#ADD src/server/views      $HOME/app/dist/views

#
# Tools
#

WORKDIR $HOME/app

RUN npm install
RUN npm install --save-dev babel-cli

#
# Exposed port for nginx-proxy (matches docker-compose.yml and docker cloud stackfile).
#

EXPOSE $VIRTUAL_PORT

#
# Switch to user.
#

USER nx

#
# Startup.
# TODO(burdon): Logging.
# https://docs.npmjs.com/misc/config#environment-variables
#

# TODO(burdon): Build webpack to avoid babel-node
CMD [ "babel-node", "src/server/main.js" ]
