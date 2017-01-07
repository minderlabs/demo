# Git


## Recipes

### Unstage files after local commit.

~~~~
git reset --soft
~~~~


### Recover deleted file (after commit)

http://stackoverflow.com/questions/953481/find-and-restore-a-deleted-file-in-a-git-repository

~~~~
read FILE && git checkout $(git rev-list -n 1 HEAD -- "$FILE")^ -- "$FILE"
~~~~
