#
# Copyright 2016 Alien Laboratories, Inc.
#

import argparse
import os
import subprocess
import sys

from oauth2client import tools
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.tools import run_flow
from oauth2client.file import Storage


OAUTH_SCOPE = 'https://www.googleapis.com/auth/chromewebstore'

UPLOAD_URL = 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/%s'
PUBLISH_URL = 'https://www.googleapis.com/chromewebstore/v1.1/items/%s/publish'
DASHBOARD_URL = 'https://chrome.google.com/webstore/developer/edit/%s'


def get_token(client_id, client_secret, flags):
    """
    Gets the access token for the Webstore API.
    NOTE: The browser must already be open with the account that manages the Chrome Extension.
    """

    print
    print 'OPENING BROWSER (User must be member of publishing group).'
    print

    # https://github.com/burnash/gspread/wiki/How-to-get-OAuth-access-token-in-console%3F
    flow = OAuth2WebServerFlow(client_id=client_id,
                               client_secret=client_secret,
                               scope=OAUTH_SCOPE,
                               redirect_uri='http://example.com/auth_return')

    storage = Storage('creds.data')

    credentials = run_flow(flow, storage, flags=flags)

    return credentials


def upload(access_token, url, file_path):

    # https://developer.chrome.com/webstore/using_webstore_api#uploadexisitng
    args = ['curl',
            '-H', 'Authorization: Bearer %s' % access_token,
            '-H', 'x-goog-api-version: 2',
            '-X', 'PUT',
            '-T', file_path,
            '-v', url]

    print
    print 'UPLOADING:'
    print ' '.join(args)
    print

    try:
        result = subprocess.check_output(args)
        if 'Error' in result:
            print result
            sys.exit(1)

    except:
        sys.exit(2)

    print


def publish(access_token, url):

    # https://developer.chrome.com/webstore/using_webstore_api#publishpublic
    args = ['curl',
            '-H', 'Authorization: Bearer %s' % access_token,
            '-H', 'x-goog-api-version: 2',
            '-H', 'Content-Length: 0',
            '-X', 'POST',
            '-v', url]

    print
    print 'PUBLISHING:'
    print ' '.join(args)
    print

    try:
        result = subprocess.check_output(args)
        if 'Error' in result:
            print result
            sys.exit(1)

    except:
        sys.exit(2)

    print


def main(argv):

    # https://docs.python.org/3/library/argparse.html
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[tools.argparser])

    parser.add_argument('--crx-id',         required=True)
    parser.add_argument('--client-id',      required=True)
    parser.add_argument('--client-secret',  required=True)
    parser.add_argument('--file',           required=True)
    parser.add_argument('--publish',        action='store_true')

    args = parser.parse_args(argv[1:])

    # Authenticate (open browser).
    credentials = get_token(args.client_id, args.client_secret, args)

    # Upload file.
    upload(credentials.access_token, UPLOAD_URL % args.crx_id, args.file)

    # Publish CRX.
    if args.publish:
        publish(credentials.access_token, PUBLISH_URL % args.crx_id)


if __name__ == "__main__":
    main(sys.argv)
