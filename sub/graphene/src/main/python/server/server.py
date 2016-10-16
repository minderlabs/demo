#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask

from data import data
from web import web


#
# Flask server.
# http://flask.pocoo.org/docs/0.11/api
#

class Server(flask.Flask):

    def __init__(self):
        super(Server, self).__init__(__name__)

        self.register_blueprint(web)
        self.register_blueprint(data, url_prefix='/data')
