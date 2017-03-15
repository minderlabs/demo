# Production Ops

## Deployment

### Web app and server

See `//sub/app/scripts/docker_push.sh`

And for more info and background on administering the Kubernetes cluster, see [Kubernetes](https://github.com/minderlabs/demo/blob/master/docs/kbase/kubernetes.md).

### Chrome extension

See `//sub/app/scripts/crx_push.sh`

## Production Data

* Firebase admin console: https://console.firebase.google.com/project/minder-beta/database/data
    * Daily backups, administered there in the
      [Backups](https://console.firebase.google.com/project/minder-beta/database/backups) tab.

## User provisioning

As of 2017.03.06, new users and groups must be added to the whitelist in order to activate
accounts:
* Edit //sub/app/src/server/data/accounts.json
* Push.
* Old records need to be deleted manually from the firebase console.

