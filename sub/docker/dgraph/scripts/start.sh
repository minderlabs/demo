#!/bin/sh

PORT=9000

DATA_DIR=/tmp/dgraph

dgraph --port ${PORT} --instanceIdx 0 --mutations ${DATA_DIR}/m --postings ${DATA_DIR}/p --uids ${DATA_DIR}/u
