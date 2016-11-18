#
# Copyright 2016 Minder Labs.
#

import flask

from server.data.database import Database

#
# App blueprint.
#

APP_STATIC_PATH = '../../../../../../demo/js/server/assets'

app = flask.Blueprint('app', __name__, static_folder=APP_STATIC_PATH)


@app.route('/', defaults={'path': ''}, endpoint='home')
@app.route('/<path:path>', endpoint='home')
def app_home(path):
    """
    Serves from all React Router paths.
    NOTE: for a large app, other blueprints should only be accessible from different subdomains.
    """

    return flask.render_template('app.html', user_id=Database.DEFAULT_USER)
