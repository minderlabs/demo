# PyCharm

- <https://youtrack.jetbrains.com/issues?q=by%3A%20me>


## Set-up

- Preferences > Lang > JavaScript > ES6


## Version Control

- https://www.jetbrains.com/help/pycharm/2016.2/managing-projects-under-version-control.html

- Click Share to put various settings under control (e.g., Run/Debug configurations).



## Shortcuts

~~~~
    F3          Toggle bookmark
    ⌘ F3        View Bookmarks

    ⌘ O         Class lookup
    
    ⌘ [         Back
    ⌘ ]         Forward
    ⌘ ⇧ DEL     Last edit location

    ⌥ ENTER     Complete

    ⌘ ⇧ F/R     Find/Replace in Path
    ⌘ ⌥ ↑       Previous match
    ⌘ ⌥ ↓       Next match
~~~~


## Nose Tests

- Run/Debug target (nosetests)

  - Root directory (e.g., sub/data)
  - Params:
    
    -c nose.cfg -A "not large"


## Useful

- Menu > Git > Compare with branch


## Troubleshooting

- Pyhon libs not found
    - Ensure in frontend's virtualenv
    - Ensure installed via pip (requirements.txt) (pip list --version)
    - Check Prefs > Project Interpreter
    - Invalidate Cache and Restart
    - Add submodule source to project settings
    - Should indicate "(library home)" next to src/main/python

- Cleanup
    - Remove ghost pyc files
    - Invalidate Caches/Restart
    
~~~~
    find sub/util/src/main/python sub/user/src/main/python sub/data/src/main/python sub/bot/src/main/python sub/frontend/src/main/python -name *.pyc | xargs rm
~~~~


## Integrations

### GitHub Issues

- https://www.jetbrains.com/help/pycharm/2016.1/enabling-integration-with-an-issue-tracking-system.html?origin=old_help
    - Settings > Tools > Tasks
        - GitHub
        - Create OAuth Token
