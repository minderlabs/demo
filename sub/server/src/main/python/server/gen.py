#
# Copyright 2016 Alien Laboratories, Inc.
#

import argparse
import errno
import json
import os

from schema import schema


parser = argparse.ArgumentParser(description='Generate schema.json')
parser.add_argument('--verbose', '-v', action='store_true')
parser.add_argument('--file', '-f', default='schema.json')
args = parser.parse_args()

data = {
    'data': schema.introspect()
}

if args.verbose:
    print json.dumps(data, indent=2)

if args.file:

    # Create directory.
    if not os.path.exists(os.path.dirname(args.file)):
        try:
            os.makedirs(os.path.dirname(args.file))

        except OSError as exc:  # Guard against race condition
            if exc.errno != errno.EEXIST:
                raise

    # Write the file.
    with open(args.file, 'w') as outfile:
        json.dump(data, outfile, indent=2)

    print '\nCreated %s\n' % args.file
