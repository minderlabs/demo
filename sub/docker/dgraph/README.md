# DGraph

- https://wiki.dgraph.io/Main_Page

- Roadmap:
    - https://github.com/dgraph-io/dgraph/issues/1


## Getting Started

- https://wiki.dgraph.io/Beginners_Guide#Installation

- Running the server:

~~~~
    # Delete database
    rm -rf db/

    dgraph --instanceIdx 0 --mutations db/m --postings db/p --uids db/u
~~~~


## Data Model

- RDF N-Quad represent "facts" (https://www.w3.org/TR/n-quads)
    - Entities have GUID: `xid_`.
    - Relationships (predicate) connect entities to values.
    - Values can be literals or entities.

    - S--{P}-->O (subject-predicate-object)

~~~~
    <entity> <predicate> VALUE .                            # Dot required.
    
    <alice> <name> "Alice" .
    <alice> <name> "Алисия"@ru .                            # @lang
    <minder-labs> <employee> <alice> .
~~~~


## Mutations

~~~~
    curl localhost:8080/query -XPOST -d $'mutation {        # $ preserves newlines (required).
      set {
        <alice> <type> <person> .
        <alice> <name> "Alice" .
        <minder-labs> <type> <organization> .
        <minder-labs> <name> "Minder Labs" .
        <minder-labs> <employee> <alice> .
      }
    }' 

    {"code":"E_OK","message":"Done"}
~~~~


## Queries

~~~~
    curl localhost:8080/query -XPOST -d '{                  # debug returns `_uid_` at each level.
      debug(_xid_: minder-labs) {
        type
        name
      }
    }'
    
    {  
      "_root_":[  
        {  
          "_uid_":"0x43061a1e14f51f5e",
        }
      ]
    }
~~~~


## Implementation

- Written in Go.
- RocksDB data store.


## Scaling

- https://github.com/dgraph-io/dgraph/issues/1
- https://wiki.dgraph.io/Beginners_Guide#Multiple_Instances_2
- https://open.dgraph.io/post/performance-throughput-latency


## Client APIs

- https://wiki.dgraph.io/Clients
