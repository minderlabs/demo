#! /usr/bin/env python

#
# Strip unnecessary devDependencies from package.json to improve docker build performance.
#

import argparse
import json
import sys

parser = argparse.ArgumentParser(
    description=__doc__,
    formatter_class=argparse.RawDescriptionHelpFormatter)

parser.add_argument('--output', required=True)
parser.add_argument('--pkg', action='append')

args = parser.parse_args(sys.argv[1:])

with open('package.json') as input_file:
    data = json.load(input_file)

del data['scripts']
del data['devDependencies']

deps = data['dependencies']
for lib in args.pkg:
    if lib in deps:
        del deps[lib]

if args.output:
    with open(args.output, 'w') as output_file:
        json.dump(data, output_file, indent=2)

else:
    print json.dumps(data, indent=2)
