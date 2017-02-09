#
# Copyright 2016 Minder Labs.
#
# Minder Demo Server Dockerfile
# minderlabs/demo
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

# Volume for local data.

RUN mkdir -p $HOME/app/var
RUN chown -R nx:nx $HOME/app/var
VOLUME $HOME/app/var

#
# Tools
#

ADD dist/package.json     $HOME/app/package.json

WORKDIR $HOME/app

RUN npm install

#
# Add sources.
#

# TODO(burdon): Set-up for Jenkins local build.
# TODO(burdon): Currently just add all unbuilt assets.

ADD dist                  $HOME/app/dist
ADD src/server/conf       $HOME/app/dist/conf
ADD src/server/public     $HOME/app/dist/public
ADD src/server/testing    $HOME/app/dist/testing
ADD src/server/views      $HOME/app/dist/views

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

CMD [ "node", "dist/server.bundle.js" ]
