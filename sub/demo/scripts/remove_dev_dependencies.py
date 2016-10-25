#
# Strip devDependencies from package.json
# Improve docker build performance.
#

import json
import sys

assert len(sys.argv) == 2

output_filename = sys.argv[1]

with open('package.json') as input_file:
    data = json.load(input_file)

del data['devDependencies']

with open(output_filename, 'w') as output_file:
    json.dump(data, output_file, indent=2)
