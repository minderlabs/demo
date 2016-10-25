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
# TODO(burdon): Test data.
# TODO(burdon): Need to check-in dist and remove devDependencies (or build everything?)
#

ADD dist            $HOME/app/dist
ADD scripts         $HOME/app/scripts
ADD package.json    $HOME/app/package.json

#
# Install deps.
# https://github.com/nodejs/docker-node#verbosity
# NOTE: logging set to info otherwise could miss errors.
#

WORKDIR $HOME/app
RUN python scripts/remove_dev_dependencies.py package.json

RUN more package.json

#RUN npm install

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
