#!/bin/sh

#
# Google Project Credentials: "Admin" 1/27/2017 (minder-beta)
# https://console.developers.google.com/apis/credentials?highlightClient=189079594739-u4tl961thu6hna6ink0pdmtu6hnnber2.apps.googleusercontent.com&project=minder-beta
#
export CLIENT_ID="189079594739-u4tl961thu6hna6ink0pdmtu6hnnber2.apps.googleusercontent.com"
export CLIENT_SECRET="Uz0KZp5XjI_AlJBM-UCKLJfO"

#
# https://chrome.google.com/webstore/developer/dashboard
# https://chrome.google.com/webstore/detail/jfekpjgleenkenjdoagecjilcnmhlncf
#
export CRX_ID="jfekpjgleenkenjdoagecjilcnmhlncf"

#
# Group is needed for publishing CRX app.
# https://groups.google.com/d/forum/minder-crx-pub
# https://developer.chrome.com/webstore?visit_id=1-636211654188889700-3011291085&rd=2
# https://chrome.google.com/webstore/developer/dashboard/u32a9eaef58cd96cf309f9a48dfd49b9d
#
export CRX_GROUP_ID="u32a9eaef58cd96cf309f9a48dfd49b9d"

DASHBOARD_URL="https://chrome.google.com/webstore/developer/dashboard/${CRX_GROUP_ID}"


# Build new bundles.
#grunt version:crx:patch
grunt build-crx

#
# Only members of the Google Group (nx-publishers@googlegroups.com) can push.
# https://groups.google.com/forum/#!forum/nx-publishers
#

# Publish CRX.
ERR=$(python ../tools/src/python/chrome_web_store.py --file=dist/crx/minder.zip --publish)

echo ###
echo ${ERR}
echo ###

# Open dashboard.

echo
echo "CRX Dashboard:\n" + ${DASHBOARD_URL}
echo

# open -a "Google Chrome" ${DASHBOARD_URL}
