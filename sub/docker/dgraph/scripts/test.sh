#!/bin/sh

PORT=9000

SERVER="localhost:${PORT}"

#
# Mutations
#

curl ${SERVER}/query -XPOST -d $'mutation {
  set {
    <alice> <type> <person> .
    <alice> <name> "Alice" .
    <minder-labs> <type> <organization> .
    <minder-labs> <name> "Minder Labs" .
    <minder-labs> <employee> <alice> .
  }
}' | python -m json.tool

#
# Query
#

curl ${SERVER}/query -XPOST -d '{
  debug(_xid_: minder-labs) {
    type
    name
    type
    employee {
      name
    }
  }
}' | python -m json.tool


# TODO(burdon): Test GraphQL query.
