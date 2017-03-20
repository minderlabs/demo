# Node

~~~~
    npm list
    npm list --depth=0 --dev
    npm list --depth=0 --prod
     
    npm outdated

    # Update to latest minor version.
    npm update karma --save-dev
    
    # Update to specified (major) version
    npm install karma@^1.0.0 --save-dev 
    
    ncu -g
    npm update -g webpack
~~~~


- http://stackoverflow.com/questions/16073603/how-do-i-update-each-dependency-in-package-json-to-the-latest-version



## Troubleshooting

- Error initializing new module (i.e., npm update)
    - Must ensure virtual env is already present and current (virtualenv tools/python)

