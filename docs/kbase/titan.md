# Titan


## Modeling

- http://s3.thinkaurelius.com/docs/titan/1.0.0/schema.html#_defining_edge_labels
- elements have schema
- schema may be changed (while db running) but element cannot change its schema


### Edges

- label to describe semantics of relationship
- define labels upfront (i.e., index), with multiplicity constraints (multi, single, one2many, etc.)

~~~~
    mgmt = graph.openManagement()
    follow = mgmt.makeEdgeLabel('follow').multiplicity(MULTI).make()
    mgmt.commit()
~~~~


### Vertices

- property keys defined upfront (i.e., indexed)
- define type (e.g., string, char, bool, UUID, geo, etc.) and cardinality (single, list, set)
- have optional labels (e.g., type)

~~~~
    mgmt = graph.openManagement()
    name = mgmt.makePropertyKey('name').dataType(String.class).cardinality(Cardinality.SET).make()
    mgmt.commit()
~~~~


### Indexing

- edge labels and vertex keys are in the same namespace and must be unique.
- support composite indexes (of multiple properties); can be used to enforce uniqueness.
- mixed indexes (support other predicates than equality); requires index backend (e.g., elasticsearch)
- ordering: order().by('age', decr).limit(10)
- index by label constraint
- vertix-specific indexes (subset index of edges; for efficiency)


## Advanced

- http://s3.thinkaurelius.com/docs/titan/1.0.0/titan-advanced.html
- in-memory backend for testing
- static vertex label (can't change on element; e.g., for type.)
- TTL for edges (across all edges)
- TTL for property (acress all vertexes)
- TTL for labels on individual vertexes
- unidirectional edges
- eventual consistency; ghost vertexes
- custom object serialization (e.g., for protos?)


### Partitioning

- http://s3.thinkaurelius.com/docs/titan/1.0.0/graph-partitioning.html
- default random partitioning
- set number of partitions; must reload graph to repartition
- edge cut: by default vertex in same txn are placed in same paritition; override IDPlacementStrategy
- vertex cut: hotspot issue (split load of single vertex across machines)


### Implementation

- http://s3.thinkaurelius.com/docs/titan/1.0.0/data-model.html
- adjacency list (store properties and incident edges with vertex); edge stored in each vertex (unless unidirectional)
- vertex id locality (auto assigned)



## Issues

- connect gremlin to titan instance
- reset database
- partition/namespace graph (per user); data locality (labels must be delared upfront -- i.e., no good for users)
- dynamic sharding
- referential integrity (delete node -> edges)
- config caching (e.g., per user)
- large protos as properties (or in REDIS?)
- How: "Ids are assigned such that vertices which are frequently co-accessed have ids with small absolute difference."
    - http://s3.thinkaurelius.com/docs/titan/1.0.0/data-model.html
- Triggers


## Feedback

- https://github.com/thinkaurelius/titan/issues
- https://groups.google.com/forum/#!forum/aureliusgraphs

