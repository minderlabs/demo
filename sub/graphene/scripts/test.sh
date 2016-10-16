#!/bin/sh

PORT=5000

SERVER="localhost:${PORT}"

#
# Query
#

curl ${SERVER}/data/graphql -XPOST -H "Content-Type:application/json" -d '{

  "query": "query User($userId_0:ID!) { user(userId: $userId_0) { id, ...F0 } } fragment F0 on User { id, title }",

  "variables": {
    "userId_0": "VXNlcjpVLTE="
  }

}' | python -m json.tool
