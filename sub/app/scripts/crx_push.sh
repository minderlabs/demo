#!/bin/sh

#
# Google Project Credentials (minder-beta)
# Create "Other" OAuth key (3/7/17).
# https://console.developers.google.com/apis/credentials?project=minder-beta
#

CLIENT_ID="189079594739-10gkom97s5dmmmjgkdaa57el6th3shko.apps.googleusercontent.com"
CLIENT_SECRET="lsFU7ZOb6mdEgo2NwMi_4pwZ"

#
# https://chrome.google.com/webstore/developer/dashboard
# https://chrome.google.com/webstore/detail/ofdkhkelcafdphpddfobhbbblgnloian
#
CRX_ID="ofdkhkelcafdphpddfobhbbblgnloian"

#
# Group is needed for publishing CRX app.
# TODO(burdon): Document.
#

# !!!
# SUPPORT TICKET
# https://developer.chrome.com/webstore/publish#set-up-group-publishing
# You cannot change which group is linked to the Group Publisher account.
# !!!

# https://groups.google.com/d/forum/minder-crx-pub
# https://developer.chrome.com/webstore?visit_id=1-636211654188889700-3011291085&rd=2
# https://chrome.google.com/webstore/developer/dashboard/u32a9eaef58cd96cf309f9a48dfd49b9d
#
CRX_GROUP_ID="u32a9eaef58cd96cf309f9a48dfd49b9d"

# TODO(burdon): Option to patch.
#grunt version:crx:patch

# Build new bundles.
grunt build-crx

#
# Output of build-crx
#

ZIP=$PWD/dist/crx/minder.zip

#
# Publish CRX.
# Only members of the Google Group (nx-publishers@googlegroups.com) can push.
# https://groups.google.com/forum/#!forum/nx-publishers
#
function push()
{
  pushd ../tools
  source ./venv/bin/activate
  python src/python/chrome_web_store.py   \
    --file=$ZIP                           \
    --crx-id=$CRX_ID                      \
    --client-id=$CLIENT_ID                \
    --client-secret=$CLIENT_SECRET        \
    --publish
  popd
}

push

DASHBOARD_URL="https://chrome.google.com/webstore/developer/dashboard/${CRX_GROUP_ID}"

echo
echo "CRX Dashboard:\n" + ${DASHBOARD_URL}
echo

# open -a "Google Chrome" ${DASHBOARD_URL}
