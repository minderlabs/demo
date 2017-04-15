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

ENV PORT=3000

ENV NODE_ENV=production

#
# Server config.
#

ENV MINDER_SERVER_URL='https://demo-dev.minderlabs.com'

# Gen 3/9/17: uuid.v4()
ENV MINDER_SESSION_SECRET="d932db47-85a2-45d9-a4d6-aa7b87ea9702"

# Gen 4/3/17: uuid.v4()
ENV MINDER_JWT_SECRET="5b08d61a-e3d1-4c96-b695-3f594c77f68a"

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
# Server modules.
#

ADD dist/package.json       $HOME/app/package.json

WORKDIR $HOME/app

RUN npm install

#
# Add sources.
#

# TODO(burdon): Set-up for Jenkins local build.
# TODO(burdon): Currently just add all unbuilt assets.

ADD conf                    $HOME/app/conf
ADD data                    $HOME/app/data

ADD dist                    $HOME/app/dist
ADD src/server/public       $HOME/app/dist/public
ADD src/server/views        $HOME/app/dist/views

ENV MINDER_NODE_MODULES   = $HOME/app/node_modules
ENV MINDER_CONF_DIR       = $HOME/app/conf
ENV MINDER_DATA_DIR       = $HOME/app/data

ENV MINDER_ASSETS_DIR     = $HOME/app/dist
ENV MINDER_PUBLIC_DIR     = $HOME/app/dist/public
ENV MINDER_VIEWS_DIR      = $HOME/app/dist/views

EXPOSE $PORT

#
# Switch to user.
#

USER nx

#
# Startup.
# TODO(burdon): Logging.
# https://docs.npmjs.com/misc/config#environment-variables
#

ENV MINDER_BOTKIT=true
ENV MINDER_SCHEDULER=true

CMD [ "node", "dist/server.bundle.js" ]
