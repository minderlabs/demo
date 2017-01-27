#! /usr/bin/env python

#
# Strip unnecessary devDependencies from package.json to improve docker build performance.
#

import json
import sys

with open('package.json') as input_file:
    data = json.load(input_file)

del data['scripts']
del data['devDependencies']

del data['dependencies']['minder-core']
del data['dependencies']['minder-graphql']
del data['dependencies']['minder-ux']

if len(sys.argv) == 2:
    output_filename = sys.argv[1]
    with open(output_filename, 'w') as output_file:
        json.dump(data, output_file, indent=2)

else:
    print json.dumps(data, indent=2)
