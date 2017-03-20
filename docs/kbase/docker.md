# Docker

First set-up your local virtual machine (see Docker Machine below)*[]:


## Overview

There are many tools:

- docker                build images; runs containers; shows logs, etc.
- docker-machine        manages virtual machines (esp. on local host); incl. Android devices.
- docker-compose        orchestrates building and running coordinated groups of local containers.
- docker-cloud          orchestrates remote containers (cloud.docker.com)

- Virtual Box           manages the creation of virtual machines on the local (Mac) host.
- Kitematic             mainly useless UX for docker commands.

- hub.docker.com        image repo and automated builds.
- cloud.docker.com      hosting service.


## Useful stuff to figure out what is happening:

~~~~
    docker logs CONTAINER
    docker exec -it CONTAINER /bin/bash       # E.g., see files inside container.

    docker-machine ip MACHINE
    docker-machine ssh MACHINE

    docker-cloud container logs CONTAINER
~~~~


## Docker Images

~~~~
    docker login
    docker images
    docker rmi $(docker images -q) 		      # Delete without -a first (since dep tree).
    docker build -t IMAGE
    docker create --name CONTAINER IMAGE
    docker start CONTAINER 
~~~~


## Docker Containers (Running images).

~~~~
    docker ps -a
    docker kill $(docker ps -aq)
    docker rm -f IMAGE
    docker rm -f $(docker ps -aq)
    docker logs -f CONTAINER
    docker exec -i -t CONTAINER bash		      # Run shell in docker container.
~~~~


## Docker Compose

- Orchestration of multiple containers.

~~~~
    docker-compose build && docker-compose up
~~~~


## Docker Machine

- Create and manage local machines.
- set machine IP address in /etc/hosts for convenience (and OAuth testing).
- Open VirtualBox to monitor

~~~~
    # Create a machine.
    # VirtualBox Manager (also to reconfigure machien).
    
    # https://docs.docker.com/engine/installation/mac/#from-your-shell
    # If recreating, remove machine (may have to reboot to get same IP address).
    docker-machine create --driver virtualbox --virtualbox-memory=4096 --virtualbox-cpu-count=2 ${DOCKER_MACHINE}
    docker-machine upgrade ${DOCKER_MACHINE}
    docker-machine inspect ${DOCKER_MACHINE}

    # Set env vars.
    eval "$(docker-machine env ${DOCKER_MACHINE})"

    docker-machine ls

    docker-machine env ${DOCKER_MACHINE}
    docker-machine ssh ${DOCKER_MACHINE}
    docker-machine start ${DOCKER_MACHINE}
~~~~


## Docker Hub

- Image repository service.


## Docker Cloud

- Manage remote machines (e.g., Digital Ocean) and containers.

- Login:

~~~~
    eval $(docker-machine env dev)
    docker login                                # Use docker hub credentials.

    ~/.docker/config.json 
~~~~



## Docker Cloud

- Container hosting service (formerly Tutum).
- Orchestration of multiple containers (extends docker compose).


## Troubleshooting

- Check ports are exposed in Dockerfile
- Check ports are exposed in stackfile

- Error (docker-compose): 
    `Error: page not found`
    
    - Check syntax errors in yml file.
        https://github.com/docker/docker/issues/17960

- Error (docker): 
    `client is newer than server (client API version: 1.23, server API version: 1.22)`

    - Update docker machine:
    
~~~~
    docker version
    docker-machine upgrade ${DOCKER_MACHINE}
    docker version
~~~~


### SSH to docker container.

- https://docs.docker.com/docker-cloud/tutorials/ssh-into-a-node

- Generate keys:

~~~~
    ssh-keygen -t rsa                   # file: dockercloud
    more ~/.ssh/dockercloud.pub
~~~~

- Add to container def:

~~~~
    authorizedkeys:
      image: dockercloud/authorizedkeys
      deployment_strategy: every_node
      autodestroy: always
      environment:
        - AUTHORIZED_KEYS=###SSH-RSA-KEY###

      volumes:
        - /root:/user:rw
~~~~


### Volumes

- https://docs.docker.com/engine/userguide/containers/dockervolumes
- Shared across containers (persist after containers are deleted; no GC)

GOAL: Shared python source (wheels) across containers (frontend, worker, etc.)
GOAL: Ability to ssh into container (e.g., packet.net).


#### Data Volume Container

- https://docs.docker.com/engine/userguide/containers/dockervolumes/#creating-and-mounting-a-data-volume-container


### Issues
 
Allen Lai allen.lai@docker.com (c/o Jerry Baker support)
Director of Global Support Services 
 
- Reliability (predictable automated builds).
- API (authentication; scope of services for building dashboard).
- UI issues: Ghost branch (/) triggers builds from wrong branch (that fail); can't delete. (Regression)
- UI not stable for years; JS errors (in general).
- UI is difficult to navigate.
- Really poor support experience (10 days to respond).
- No updated on issues (> 300; 12 months old).
- Ephemeral errors in Docker Cloud ("oops"); instead of queue.
    - E.g., 3 second alert (if you happen to have the page open):
    - CLI completes without error!
    - ERROR: No nodes available to set host port 80. Nodes required: 1; Nodes available: 0 ERROR: Service Redeploy action on 'nginx' (using 'alienlaboratories/nginx:latest') has failed
    - Click here for more information
- Community: any response from Docker Hub support?
- If something breaks (cloud); hard to figure out what is going on
    - E.g., process "starting" forever (click-to-deploy authorizedkeys example); nothing inlogs
- Trigger clean-up of terminated containers
- docker-cloud commands fail with no errors
    - E.g., docker-cloud service run --autoredeploy alienlaboratories/nginx
- Feature: load-balancing; rollover-to-prod (of machine traffic); prod canaries.
- Feature: Hook on error
- Feature: Console/logs windows too small
- Redepoloy error:
    - ERROR: Cannot authenticate with registry-1.docker.io: 401 Client Error: Unauthorized for url: https://registry-1.docker.io/v2/alienlaboratories/nginx/manifests/latest
- Restart server (while logging); restart terminal popup lasts 500ms.
- !!! https://goto.docker.com/UnsubscribePage.html (requires enter email); even the least technical companies provide 1 link to unsubscribe
- Can't unsubscribe to docker forums from web (still get junkmail)
- Issues get addressed > 1 week later and are totally irrelevant (e.g., oops ballonons; response: we don't see anything wrong with your account).
- Team support ???
- Welcome message (after 12 months); after logging in.
    Hi richburdon, Welcome to Docker Cloud!
- Unable to see logs of stopped container (but gives tab option -- blank)
- Stuck termination for 2 hours
- Keep updating docker cloud UI, but don't fix any problems (and don't unify with docker hub)
- Error Autodeploy failed (window disappears before I can read the details). UI DESIGNER IS A FUCKING IDIOT. No way to discover.
- Frequently timesout:
    PING docker.io (52.73.94.64): 56 data bytes
    Request timeout for icmp_seq 0
    traceroute fails
    http://stackoverflow.com/questions/31990757/network-timed-out-while-trying-to-connect-to-https-index-docker-io
- Docs so useless I have hid them from search results
