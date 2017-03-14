//
// Copyright 2016 Minder Labs.
//

import * as firebase from 'firebase';

import { ErrorUtil } from 'minder-core';

import { GoogleApiConfig } from '../../common/defs';

const logger = Logger.get('gcm');

/**
 * Base class for Google Cloud Messaging.
 */
class CloudMessenger {

  // TODO(burdon): Provide callback to reregister with server when token expires.

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {QueryRegistry}queryRegistry
   * @param {EventHandler} eventHandler
   */
  constructor(config, queryRegistry, eventHandler) {
    console.assert(config && queryRegistry);
    this._config = config;
    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;
    this._onTokenUpdate = null;
  }

  /**
   * Set callback called when the token is automatically refreshed.
   * @param onTokenUpdate
   */
  onTokenUpdate(onTokenUpdate) {
    this._onTokenUpdate = onTokenUpdate;
  }

  /**
   * Register with the FCM/GCM server.
   * @return {Promise<pushToken>}
   */
  connect(onMessage) {
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
  onMessage(data) {
    logger.info('Received: ' + JSON.stringify(data));
    this._eventHandler.emit({ type: 'network.in' });

    // TODO(burdon): Check not from us.
    console.log(':::::', data, this._config)
    this._queryRegistry.invalidate();
  }
}

/**
 * https://firebase.google.com/docs/cloud-messaging/js/client
 * https://github.com/firebase/quickstart-js/blob/master/messaging/index.html
 *
 * NOTE: Uses a service worker, which requires serving a manifest.json which contains the gcm_sender_id.
 */
export class FirebaseCloudMessenger extends CloudMessenger {

  // TODO(burdon): Instance API (server side admin for client).
  // https://developers.google.com/instance-id/reference/server#get_information_about_app_instances

  constructor(config, queryRegistry, eventHandler) {
    super(config, queryRegistry, eventHandler);
  }

  connect() {

    // https://firebase.google.caom/docs/cloud-messaging/js/receive#handle_messages_when_your_web_app_is_in_the_foreground
    firebase.messaging().onMessage(data => {
      this.onMessage(data);
    });

    // The token is updated when the user clears browser data.
    // https://firebase.google.com/docs/cloud-messaging/js/client#monitor-token-refresh
    firebase.messaging().onTokenRefresh(() => {
      firebase.messaging().getToken().then(messageToken => {
        this._onTokenUpdate && this._onTokenUpdate(messageToken);
      });
    });

    // https://firebase.google.com/docs/cloud-messaging/js/client#request_permission_to_receive_notifications
    return firebase.messaging().requestPermission()
      .then(() => {

        // NOTE: Requires HTTPS (for Service workers); localhost supported for development.
        // https://developers.google.com/web/fundamentals/getting-started/primers/service-workers#you_need_https
        logger.log('Requesting message token...');
        return firebase.messaging().getToken().then(messageToken => {
          if (!messageToken) {
            logger.warn('FCM Token expired.');
            return null;
          } else {
            return messageToken;
          }
        });
      })

      .catch(error => {
        // Permission not set (set in Chrome (i) button to the left of the URL bar).
        // TODO(burdon): Show UX warning.
        logger.warn('FCM registration failed: ' + ErrorUtil.message(error));
        return null;
      });
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

  // TODO(burdon): Store token!

  constructor(config, queryRegistry, eventHandler) {
    super(config, queryRegistry, eventHandler);

    // https://developer.chrome.com/apps/gcm#event-onMessage
    chrome.gcm.onMessage.addListener(message => {
      let { data, from, collapseKey } = message;

      // Use collapseKey to prevent chatty pings.
      // https://developers.google.com/cloud-messaging/chrome/client#collapsible_messages

      // Max message size: 4K.
      this.onMessage(data);
    });
  }

  // TODO(burdon): Use for upstream messages (XMPP)?
  // https://developers.google.com/cloud-messaging/chrome/client#send_messages

  connect() {
    return new Promise((resolve, reject) => {
      logger.log('Requesting token...');

      // https://developers.google.com/cloud-messaging/chrome/client
      chrome.gcm.register([ String(GoogleApiConfig.projectNumber) ], messageToken => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError);
        }

        resolve(messageToken);
      });
    });
  }

  disconnect() {
    chrome.gcm.unregister(() => {
      console.assert(!runtime.lastError);
    });
  }
}
