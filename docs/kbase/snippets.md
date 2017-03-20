#
# Shell
#

~~~~
    grep STR * -R --exclude-dir DIR
    grep STR * -R --exclude=*min* DIR
    
    lsof -i -n -P | grep TCP
    
    find . -name *requirements.txt | xargs grep Flask
    find . -name STR
    find . -name activate | xargs -I XXX bash -c 'echo XXX'

    # Get headers
    curl -I http://www.google.com
    
    # Get second word of each line.
    ps aux | awk '{print $2}'
~~~~

#
# Brew
#

~~~~
    brew update
    brea list -l
    brew upgrade --outdated
    brew cleanup
    brew doctor
    brew tap REPO
    brew untap
~~~~

#
# Node
#

~~~~
    npm update
    npm install X --save-dev
    
    for package in `ls node_modules`; do npm uninstall $package; done;
~~~~

#
# Git
#
# git: http://stackoverflow.com/questions/19508849/how-to-fix-broken-submodule-config-in-git
# http://py2neo.org/2.0/essentials.html
# https://developer.mozilla.org/en-US/docs/Web
# https://developers.google.com/protocol-buffers/docs/pythontutorial
# https://developers.google.com/protocol-buffers/docs/reference/python-generated
# https://pypi.python.org/pypi/redis
#

~~~~
    git checkout --theirs FILE
    git checkout -f FILE
    git commit --amend
    git commit --tags
    git diff --name-only --diff-filter=U            # Show conflicts.
    git diff HEAD -- FILE
    git diff origin/master -- FILE
    git grep
    git log --pretty=oneline --abbrev-commit
    git log -n 5 --stat
    git log origin/master..master
    git push --recurse-submodules=on-demand
    git remote -v					                # Show repo
    git remote set-url origin REPO
    git reset					                    # Unstage all files (don't lose any edits, just remove from pending commit).
    git reset PATH                                  # Unstage file
    git reset --soft HEAD~                          # Revert last commit (don't lose any edits)
    git reset --soft HEAD~1 && git reset HEAD PATH	# Revert last commit and remove PATH from changelist
    git rev-parse --show-toplevel
    git rm --cached -r DIR
    git rm SUB                                      # Remove submodule
    git show HASH --name-only
    git status
    git status --porcelain
    git tag TAG
    
    git submodule -q foreach 'echo $name'
    git submodule add REPO DIR                      # Files: .gitmodules .git/config .git/modules
    git submodule deinit DIR && git rm DIR		    # Remove
    git submodule foreach 'git commit -a || : && git push' && git commit -a && git push && git status
    git submodule foreach --recursive git pull
    git submodule foreach --recursive git status
    git submodule foreach git checkout master
    git submodule init DIR
    git submodule status --recursive
    git submodule update --init
~~~~

#
# Python
#

~~~~
    source ./tools/python/bin/activate		# Activate virtualenv
    source `find . -name activate`
    
    virtualenv DIR
    
    pip freeze --local | grep -v '^\-e' | cut -d = -f 1 | xargs -n1 pip install --upgrade
    pip freeze | xargs pip uninstall -y
    pip install --upgrade -r requirements.txt
    pip list --outdated
~~~~

#
# Docker
#

~~~~
    docker build -t IMAGE .
    docker exec -i -t CONTAINER bash		  # Run shell in docker container.
    docker images
    docker kill $(docker ps -aq)
    docker login
    docker logs CONTAINER
    docker ps -a
    docker rm $(docker ps -aq)
    docker rmi $(docker images -q) 			  # Delete without -a first (since dep tree).
    docker run --name CONTAINER IMAGE
    
    docker-compose build && docker-compose up
    
    docker-machine env
    docker-machine ls
    docker-machine ssh default
    docker-machine start default
~~~~

#
# Misc tools
#

~~~~
    gcloud components update
    
    redis-cli -h `docker-machine ip default` -n 1 keys "*"
~~~~
