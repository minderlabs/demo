#
# Copyright 2016 Minder Labs.
#
# Minder Scheduler
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

ENV PORT=9000

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
# Tools
#

ADD dist/package.json $HOME/app/package.json

WORKDIR $HOME/app

RUN npm install

#
# Add sources.
#

ADD dist $HOME/app/dist

EXPOSE $PORT

#
# Switch to user.
#

USER nx

#
# Startup.
#

CMD [ "node", "dist/scheduler.bundle.js" ]
