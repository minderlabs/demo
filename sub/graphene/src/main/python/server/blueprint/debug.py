#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask

from server.data.schema import schema


#
# Debug blueprint.
#

debug = flask.Blueprint('debug', __name__)


@debug.route('/', endpoint='home')
def debug_home():
    return flask.render_template('debug.html', json=schema.introspect())