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

# Used by nginx-proxy and configures node server.
ENV VIRTUAL_PORT=3000

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

ADD .babelrc                  $HOME/app/.babelrc
ADD package.json              $HOME/app/package.json
ADD package-dev.json          $HOME/app/package-dev.json
ADD webpack-base.config.js    $HOME/app/webpack-base.config.js
ADD webpack-server.config.js  $HOME/app/webpack-server.config.js
ADD webpack.config.js         $HOME/app/webpack.config.js

ADD scripts                   $HOME/app/scripts
ADD tools                     $HOME/app/tools

ADD index.web.js              $HOME/app/index.web.js
ADD js                        $HOME/app/js

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

RUN BABEL_ENV=production babel-node ./tools/babel/update_schema.js
RUN BABEL_ENV=production webpack

RUN BABEL_ENV=server webpack --config webpack-server.config.js

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
