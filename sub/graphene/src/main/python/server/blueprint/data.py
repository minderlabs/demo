#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask

from server.data.schema import schema


#
# Data blueprint.
#

data = flask.Blueprint('data', __name__)


@data.route('/schema')
def web_home():
    return flask.make_response(flask.json.dumps(schema.introspect()))


@data.route('/graphql', methods=['POST'])
def data_graphql():
    assert flask.request.mimetype == 'application/json'

    request = flask.request.json
    print 'REQ =', flask.json.dumps(request, indent=2)

#   response = { "data": schema.execute(flask.json.dumps(request)).data }
    response = { "data": { "user": { "id": "VXNlcjpVLTE=", "title": "Test User" } } }
    print 'RES =', response

    return flask.make_response(flask.json.dumps(response))
