# Redis

~~~~
    brew install redis
    
    redis-cli -h `docker-machine ip default`
    
    keys "*"
    hgetall "U:1"
    smembers "UA:U:1"
    get "A:google.com:116465153085296292090"
~~~~


## Keys

- Expire (TTL)


## Types

- <http://redis.io/topics/data-types>


### List

- Insertion order; add front/back (i.e., stack).
- Capped lists.
- Blocking operations (e.g., for queue).


### Hash

- Unordered maps of string valued fields (encode object).


### Set

- Unorderd map of string values (set, get).


### Sorted set

- String values ordered by float ("score"); if same score then ordered by key.
- By key range (if all have same score).
- Request/remove by range.

- <http://redis.io/topics/data-types#sorted-sets>
- <http://stackoverflow.com/questions/17153154/redis-data-structure-design-for-sorting-time-based-values>


### Bit array

- Not datastructure: operations on strings (which may be values of other data structures).
- Array of bits (as strings).
- E.g., bit represents binary field mapped onto contiguous datastructure (i.e., indexed by bit position).
- E.g., represent visits to site (each bit 1/0 for consecutive days).
- Operations on ranges.


### HyperLogLogs

- Probabalistic data structure to estimate cardinality of set.
- E.g., use to track membership of a set (e.g., query results).