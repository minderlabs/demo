# Regular Expressions

## Resources
  - https://regex101.com
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  - https://docs.python.org/2/library/re.html

## Lang

- Language differences:

~~~~
    # Python
    m = re.match(r'.*no.?reply.*@.*', value)

    // Javascript
    let re = /pattern/flags;
    let m = value.match(re);
~~~~


## Recipes

~~~~
    # ?: match 0 or 1 (same as {0,1})
    .*no.?reply.*@.*

    # ?: makes operator non-greedy (match as little as possible).
    
    # Optional prefix (namespace/) with id.
    # NOTE: ?: means don't capture the outer group with the trailing / (so only the inner is preserved).
    re.match('(?:(.+)/)?(.+)', 'namespace/id')
~~~~    
  
    
## Reference

~~~~
    # Beginning to end (of line).
    ^(.*)$
    
    
~~~~
