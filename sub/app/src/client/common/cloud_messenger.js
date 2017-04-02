//
// Copyright 2016 Minder Labs.
//

import * as firebase from 'firebase';

import { Async, ErrorUtil } from 'minder-core';

import { GoogleApiConfig, FirebaseAppConfig } from '../../common/defs';

const logger = Logger.get('cloud');

/**
 * Base class for Google Cloud Messaging.
 */
class CloudMessenger {

  // TODO(burdon): Provide callback to re-register with server when token expires.

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {EventHandler} eventHandler
   */
  constructor(config, eventHandler) {
    console.assert(config && eventHandler);
    this._config = config;
    this._eventHandler = eventHandler;
    this._onTokenUpdate = null;
    this._onMessage = null;

    // Timer to prevent multiple push invalidations within time period.
    this._messages = [];
    this._delay = Async.delay(1000);
  }

  /**
   * Set callback called when the token is automatically refreshed.
   * @param onTokenUpdate
   */
  onTokenUpdate(onTokenUpdate) {
    this._onTokenUpdate = onTokenUpdate;
    return this;
  }

  /**
   * Register callback.
   * @param onMessage
   */
  listen(onMessage) {
    this._onMessage = onMessage;
    return this;
  }

  /**
   * Register with the FCM/GCM server.
   * @return {Promise<pushToken>}
   */
  connect() {
    throw new Error('Not implemented.');
  }

  /**
   * Unregister with the FMC/GCM server.
   */
  disconnect() {
    throw new Error('Not implemented.');
  }

  /**
   * Message callback.
   * @param data
   */
  fireMessage(data) {
    logger.info('Received: ' + JSON.stringify(data));
    this._eventHandler.emit({ type: 'network.in' });

    // Ignore invalidations from self.
    if (_.get(this._config, 'registration.clientId') !== data.senderId || data.force) {
      // TODO(burdon): Use collapse key to determine if first message can be skipped.
      this._messages.push(data);
      this._delay(() => {
        if (this._messages.length > 1) {
          logger.warn('Collapsing messages: ' + JSON.stringify(this._messages));
        }

        this._onMessage && this._onMessage(data);
        this._messages = [];
      });
    }
  }
}

/**
 * https://firebase.google.com/docs/cloud-messaging/js/client
 * https://github.com/firebase/quickstart-js/blob/master/messaging/index.html
 *
 * NOTE: Uses a service worker, which requires serving a manifest.json which contains the gcm_sender_id.
 */
export class FirebaseCloudMessenger extends CloudMessenger {

  static TIMEOUT = 3000;

  // TODO(burdon): Instance API (server side admin for client).
  // https://developers.google.com/instance-id/reference/server#get_information_about_app_instances

  connect() {

    // https://console.firebase.google.com/project/minder-beta/overview
    firebase.initializeApp(FirebaseAppConfig);

    // https://firebase.google.caom/docs/cloud-messaging/js/receive#handle_messages_when_your_web_app_is_in_the_foreground
    firebase.messaging().onMessage(data => {
      this.fireMessage(data);
    });

    // The token is updated when the user clears browser data.
    // https://firebase.google.com/docs/cloud-messaging/js/client#monitor-token-refresh
    firebase.messaging().onTokenRefresh(() => {
      firebase.messaging().getToken().then(messageToken => {
        logger.log('Token updated.');
        this._onTokenUpdate && this._onTokenUpdate(messageToken);
      });
    });

    return Async.abortAfter(() => {

      // https://firebase.google.com/docs/cloud-messaging/js/client#request_permission_to_receive_notifications
      return firebase.messaging().requestPermission()
        .then(() => {

          // NOTE: Requires HTTPS (for Service workers); localhost supported for development.
          // https://developers.google.com/web/fundamentals/getting-started/primers/service-workers#you_need_https
          logger.log('Requesting message token...');
          return firebase.messaging().getToken().then(messageToken => {
            if (!messageToken) {
              throw new Error('FCM Token expired.');
            }

            logger.log('Connected.');
            return messageToken;
          });
        })

        .catch(error => {

          // Errors: error.code
          // - messaging/permission-blocked
          //   TODO(burdon): Show UX warning.
          //   Permission not set (set in Chrome (i) button to the left of the URL bar).
          // - messaging/failed-serviceworker-registration
          //   Invalid Firebase console registration.
          throw new Error('FCM registration failed: ' + ErrorUtil.message(error.code));
        });

    }, FirebaseCloudMessenger.TIMEOUT);
  }

  disconnect() {}
}

/**
 * https://developer.chrome.com/apps/gcm
 * https://developers.google.com/cloud-messaging/gcm
 *
 * NOTE: manifest.json must contain gcm permission.
 */
export class GoogleCloudMessenger extends CloudMessenger {

  // TODO(burdon): Store token?

  constructor(config, eventHandler) {
    super(config, eventHandler);

    // https://developer.chrome.com/apps/gcm#event-onMessage
    chrome.gcm.onMessage.addListener(message => {
      let { data, from, collapseKey } = message;

      // Use collapseKey to prevent chatty pings.
      // https://developers.google.com/cloud-messaging/chrome/client#collapsible_messages

      // Max message size: 4K.
      this.fireMessage(data);
    });
  }

  // TODO(burdon): Use for upstream messages (XMPP)?
  // https://developers.google.com/cloud-messaging/chrome/client#send_messages

  connect() {
    return new Promise((resolve, reject) => {
      logger.log('Requesting message token...');

      // https://developers.google.com/cloud-messaging/chrome/client
      chrome.gcm.register([ String(GoogleApiConfig.projectNumber) ], messageToken => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError);
        }

        logger.log('Connected.');
        resolve(messageToken);
      });
    });
  }

  disconnect() {
    return chrome.gcm.unregister(() => {
      console.assert(!runtime.lastError);
      logger.log('Disconnected.');
    });
  }
}
