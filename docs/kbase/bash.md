# Bash


## Snippets

~~~~
    $?  exit code of last command
    $@  all args    
~~~~


~~~~
    grep STR * -R --exclude-dir DIR
    grep STR * -R --exclude=*min* DIR
    
    lsof -i -n -P | grep TCP
    
    find . -name *requirements.txt | xargs grep Flask
    find . -name STR
    find . -name activate | xargs -I XXX bash -c 'echo XXX'

    pip freeze --local | grep -v '^\-e' | cut -d = -f 1 | xargs -n1 pip install -U
    
    # Skip first line then extract the first word.
    ps | tail -n +2 | awk '{print $1}'
    
    # Get PID of process.
    ps -u root | grep nginx | grep -v grep | awk '{print $2}'
    
    dig www.darkzerk.net
~~~~


## Refs

- http://tldp.org/LDP/abs/html
- http://www.faqs.org/docs/abs/HTML/options.html
- http://wiki.bash-hackers.org/syntax/quoting
