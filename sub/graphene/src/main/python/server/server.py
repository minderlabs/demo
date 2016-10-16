#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask


#
# Web blueprint
#

web = flask.Blueprint('web', __name__)


@web.route('/')
def web_home():
    return 'Hello'


#
# Flask server.
# http://flask.pocoo.org/docs/0.11/api
#

class Server(flask.Flask):

    def __init__(self):
        super(Server, self).__init__(__name__)

        self.register_blueprint(web)
