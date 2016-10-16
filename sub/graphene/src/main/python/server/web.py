#
# Copyright 2016 Alien Laboratories, Inc.
#

import flask


#
# Web blueprint.
#

web = flask.Blueprint('web', __name__)

@web.route('/')
def web_home():
    return 'Hello'
