#!/bin/sh

PYTHONPATH=tools/python/lib/python2.7/site-packages:src/main/python python src/main/python/server/tools/gen.py -f build/schema.json
