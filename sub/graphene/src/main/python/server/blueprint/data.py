#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask
from flask import json
from graphql_relay import to_global_id

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

    query = request['query']
    variables = request['variables']

    # TODO(burdon): Testing.
    # http://127.0.0.1:8080/graphql?query=query%20User(%24userId%3A%20ID!)%20%7B%0A%20%20user(userId%3A%20%24userId)%20%7B%0A%20%20%20%20id%0A%20%20%20%20title%0A%20%20%7D%0A%7D%0A&operationName=User&variables=%7B%0A%20%20%22userId%22%3A%20%22VXNlcjpVLTE%3D%22%0A%7D
    if False:
        query = '''
            query User($userId: ID!) {
              user(userId: $userId) {
                id
                title
              }
            }
        '''

        variables = {
          "userId": to_global_id('User', 'U-1')
        }

    # TODO(burdon): Second query returns None (since not like first which is faked).
    # print 'Query =', query
    # print 'Variables =', variables

    # Execute the query.
    result = schema.execute(query, variable_values=variables)

    # Convert OrderedDict to regular dict.
    data = json.loads(json.dumps(result.data))

    # TODO(burdon): Testing (return user with items?)
    if False:
        data = { "user": { "id": "VXNlcjpVLTE=", "title": "Test User" } }

    reponse = { "data": data }
    print 'RES =', reponse

    return flask.jsonify(reponse)
