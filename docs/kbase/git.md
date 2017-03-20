# Git

### Helpful links

* [Really, Really Basic Guide](http://rogerdudler.github.io/git-guide).
* Awesome guide about [undoing commits and fixing errors](http://sethrobertson.github.io/GitFixUm/fixup.html).
* Cute interactive [cheat sheet](http://www.ndpsoftware.com/git-cheatsheet.html#loc=workspace;).
* Great page of [10 things you didn't know github and git could do](http://owenou.com/2012/01/13/ten-things-you-didnt-know-git-and-github-could-do.html).


### Create a remote branch

~~~
    # create a local branch:
    git checkout -b <branch>

    # push a (new) local branch to remote, and track it.
    git push -u origin <branch>
~~~

### Update your local copy of a tracked branch from origin without switching branches.

For example, you're working in a feature branch and want to pull the latest changes in master
so you can merge them:

~~~
# Pull latest changes into master without switching branches:
git fetch origin master:master
# Then merge into your current branch:
git merge master
~~~


### Check out a remote branch and track it

~~~~
    git fetch # or git pull
    git checkout <name of branch>
    # Or more verbosely:
    git checkout --track origin/<branch>
~~~~

- Take move current changes (in master) to remote branch

~~~~
    git stash
    git checkout --track origin/<branch>
    git stash apply
~~~~


### Delete a remote branch:

- assuming you’re already tracking it locally.

~~~
    git push origin --delete <branch>

    # Now delete locally:
    git branch -d <branch>

    # And to check it's gone.
    git fetch -p origin
    git branch -a
~~~


### Diffing branches and commits

~~~
    # Diff the current head against.
    # Just show stats, not full diff.    
    git diff —stat origin/master
    git difftool origin/master
    
    # Diff a commit against its direct parent:
    git show <commit>

    # As above, but you can use difftool:
    git [diff|difftool] <commit>^!
~~~


### Reverting or undoing commits:

See this awesome guide: (http://sethrobertson.github.io/GitFixUm/fixup.html)
e.g.:

~~~
    # discard local changes relative to the upstream origin:
    git reset --hard @{u}

    # uncommit the last change, restage the changes:
    git reset HEAD^
~~~

### Recover deleted file (after commit)

http://stackoverflow.com/questions/953481/find-and-restore-a-deleted-file-in-a-git-repository

~~~~
git checkout $(git rev-list -n 1 HEAD -- "$FILE")^ -- "$FILE"
~~~~


### Finding the common ancestor between two branches

`git merge-base branch1 branch2`

This is useful when you want to see all the changes you’ve made since branching from master, but
master has now progressed far beyond that ancestor, so diffing directly is too ugly. e.g.:

`git difftool $(git merge-base mybranch master)`


### Pulling files selectively from one branch into another.

Sometimes there’s code in one branch that you want to merge into another, but a full branch merge
is too dangerous or unwanted.  In these cases you can do a poor man’s merge of specific files
with:

`git checkout <branch_to_pull_from> <paths_to_pull>`

See this article:
[How to "Merge" Specific Files from Another Branch](http://jasonrudolph.com/blog/2009/02/25/git-tip-how-to-merge-specific-files-from-another-branch/)


### Git copy folder from one repo to another with history:

http://gbayer.com/development/moving-files-from-one-git-repository-to-another-preserving-history/


## Cleaning up Big Files

### Undo adding a huge file locally before pushing to remote:

This prevents making git huge for eternity.

http://git-scm.com/book/en/Git-Internals-Maintenance-and-Data-Recovery#Removing-Objects


### Finding the largest 20 files in git history

`git rev-list --objects --all | grep "$(git verify-pack -v .git/objects/pack/*.idx | sort -k 3 -n | tail -20 | awk '{print$1}')"`


### Deleting the largest files from git history

https://rtyley.github.io/bfg-repo-cleaner/


## Aliases, Customization

### Useful aliases for your .bashrc, customize as desired.

~~~
    source ~/.git/git-completion.bash
    alias gtd='git difftool -t vimdiff'
    alias gcm='git commit -a -m "."'
    alias ggs='git status'
    alias gb='git branch -vv' # More verbose and useful display of branches
    alias gl='git log --graph --decorate --oneline'
~~~


### For vi usersgit stash
git checkout branch123
git stash apply

* [Fugitive](https://github.com/tpope/vim-fugitive) is a vim plugin with nice git integration.
  E.g. :Gblame, :Gcommit, :Gstatus.  Try :Glog and then quickfix commands (:copen, :cn, :cp) to
  navigate through commit history of current file.
* Set your diff.tool and merge.tool to vimdiff in .gitconfig:

~~~
  git config --global diff.tool vimdiff
  git config --global merge.tool vimdiff
~~~


## Github

* Use the [File finder](https://github.com/Clarifai/clarifai/find/master) for searching
by filename.  Press ‘t’ on the repo page.
* Create a custom search alias in Chrome (Settings > Manage Search Engines) pointing
to github code search:  e.g. to
https://github.com/alienlaboratories/nx-lite/search?utf8=%E2%9C%93&q=%s



## Snippets

- http://stackoverflow.com/questions/19508849/how-to-fix-broken-submodule-config-in-git


~~~~
    git config --get remote.origin.url                                  # Current repo.


    # http://stackoverflow.com/questions/953481/find-and-restore-a-deleted-file-in-a-git-repository
    git status | grep deleted | awk '{print $2}' | xargs git checkout   # Recover deleted files.

    git ls-files                                                        # Show files under version control.

    git checkout --theirs FILE
    git checkout -f FILE
    git commit --amend
    git commit --tags
    git show                                                            # Show diff of last commit.
    git diff @^ @                                                       # Show @ == HEAD.
    git diff HEAD^ HEAD                                                 # Show diff of last commit.
    git diff --name-only --diff-filter=U                                # Show conflicts.
    git diff HEAD -- FILE
    git diff origin/master -- FILE
    git grep
    git log --pretty=oneline --abbrev-commit
    git log -n 5 --stat
    git log origin/master..master
    git push --recurse-submodules=on-demand
    git remote -v					                                              # Show repo
    git remote set-url origin REPO
    git reset					                                                  # Unstage all files (don't lose any edits, just remove from pending commit).
    git reset PATH                                                      # Unstage file
    git reset --soft HEAD~                                              # Revert last commit (don't lose any edits)
    git reset --soft HEAD~1 && git reset HEAD PATH	                    # Revert last commit and remove PATH from changelist
    git rev-parse --show-toplevel
    git rm --cached -r DIR
    git rm SUB                                                          # Remove submodule
    git show HASH --name-only
    git status
    git status --porcelain
    git tag TAG
        
    # List deleted files
    git log --all --pretty=format: --name-only --diff-filter=D | sort -u
    git log --graph --decorate qq--oneline --decorate

    git rev-list -n 1 HEAD -- <file_path>                               # Find commit for deleted file
    
    git submodule -q foreach 'echo $name'
    git submodule add REPO DIR                                          # Files: .gitmodules .git/config .git/modules
    git submodule deinit DIR && git rm DIR		                          # Remove
    git submodule foreach 'git commit -a || : && git push' && git commit -a && git push && git status
    git submodule foreach --recursive git pull
    git submodule foreach --recursive git status
    git submodule foreach git checkout master
    git submodule init DIR
    git submodule status --recursive
    git submodule update --init
~~~~


# Branches

## Merging

- Auto-merge:
    - https://medium.com/@porteneuve/how-to-make-git-preserve-specific-files-while-merging-18c92343826b#.xq7ssih6x
    - .gitattributes defines merge strategy.

  - https://gist.github.com/tmaybe/4c9d94712711229cd506
  - .git/config (referenced by .gitattributes)

## Move changes to existing branch

~~~~
    git stash
    git checkout branch123
    git stash apply
~~~~

