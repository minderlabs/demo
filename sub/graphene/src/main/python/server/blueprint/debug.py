#
# Copyright 2016 Minder Labs.
#

import flask

from server.data.schema import g


#
# Debug blueprint.
#

debug = flask.Blueprint('debug', __name__)


@debug.route('/', endpoint='home')
def debug_home():
    return flask.render_template('debug.html', json=g.schema.introspect())
