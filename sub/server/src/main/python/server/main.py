#
# Copyright 2016 Alien Laboratories, Inc.
#

from server import Server


if __name__ == '__main__':
    server = Server()
    server.run(debug=True)

    print 'RUNNING'
