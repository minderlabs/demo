#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask

from blueprint.app import app
from blueprint.data import data
from blueprint.debug import debug

from server.data.memory_database import MemoryDatabase
from server.data.schema import g


#
# Flask server.
# http://flask.pocoo.org/docs/0.11/api
#


class Server(flask.Flask):

    def __init__(self):
        super(Server, self).__init__(__name__, static_folder='static', template_folder='templates')

        self.register_blueprint(app)
        self.register_blueprint(data, url_prefix='/data')
        self.register_blueprint(debug, url_prefix='/debug')


if __name__ == '__main__':
    g.init(MemoryDatabase().load())

    server = Server()
    server.run(debug=True)
