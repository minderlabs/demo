# TinkerPop


## TinkerPop stack

- Gremlin:      query language
- RexPro:       binary protocol (for gremlin) (more efficient than HTTP Rexter)
- Rexter        REST API
- Bluprints:    abstraction of Graph (Titan, Neo4J, etc.)


- git clone http://github.com/tinkerpop/gremlin.git (out-of-date)
- git clone http://github.com/apache/incubator-tinkerpop


### Gremlin Console

Out of date: http://github.com/tinkerpop/gremlin.git
Current (10 mins to build)

~~~~
    git clone https://github.com/apache/incubator-tinkerpop
    mvn clean install
~~~~

- http://tinkerpop.apache.org/docs/3.2.1-SNAPSHOT/reference/


### Gremlin

~~~~
    v1 = g.addV('name', 'Hello')

    v1 = g.V().has('name', 'NX').next()
    g.V(v1).valueMap()
    
    edges = g.E().has('place', geoWithin(Geoshape.circle(37.97, 23.72, 50)))
~~~~



## Python APIs

- Gremlin (http://tinkerpop.apache.org)

    - Query Languages
X       - gremlin-py            python3 only
X       - gremlin-python        Nov 2015;  50 commits/0 issues; no PyPl
    
    - Drivers
X       - aiogremlin            python3 only
        - gremlinclient         May 2016; 143 commits/5 issues; http://gremlinclient.readthedocs.io (build error)
        - gremlinrestclient     Mar 2016;  37 commits/5 issues; http://gremlinrestclient.readthedocs.io
X       - python-gremlin-rest   Deb 2016;  18 commits/0 issues; no PyPl
   
- Rexter (https://github.com/tinkerpop/rexster/wiki)

    - http clients
X       - bulbs                 Oct 2014 Neo4J focus http://bulbflow.com/docs
X       - mogwai                Non standard OGM https://mogwai.readthedocs.io
X       - graphalchemy          Mar 2014

    - rexpro clients
        - rexpro-python         Nov 2015; 110 commits/7 issues; https://github.com/platinummonkey/rexpro-python (trivial: pass query as text)
X       - python-rexter         Nov 2012; https://pypi.python.org/pypi/python-rexster

