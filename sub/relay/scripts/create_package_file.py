#
# Strip unnecessary devDependencies from package.json to improve docker build performance.
#

import json
import sys

with open('package.json') as input_file:
    data = json.load(input_file)

with open('package-dev.json') as input_file:
    dev = json.load(input_file)

data['devDependencies'] = dev['devDependencies']

if len(sys.argv) == 2:
    output_filename = sys.argv[1]
    with open(output_filename, 'w') as output_file:
        json.dump(data, output_file, indent=2)

else:
    print json.dumps(data, indent=2)
