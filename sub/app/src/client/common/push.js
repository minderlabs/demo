//
// Copyright 2016 Minder Labs.
//

import * as firebase from 'firebase';

const logger = Logger.get('push');

/**
 * Manages the client connection and registration.
 */
export class PushManager {

  /**
   * Registers client (and push socket).
   *
   * @param {object} config
   * @param {QueryRegistry}queryRegistry
   * @param {EventHandler} eventHandler
   */
  constructor(config, queryRegistry, eventHandler) {
    console.assert(config && queryRegistry && eventHandler);
    this._config = config;
    this._queryRegistry = queryRegistry;
    this._eventHandler = eventHandler;
  }

  /**
   * Get the messagings token.
   * @returns {Promise}
   */
  connect() {
    // TODO(burdon): CRX?
    // https://developer.chrome.com/apps/gcm
    // 3/1/17 Send support message: https://firebase.google.com/support/contact/troubleshooting

    // https://github.com/firebase/quickstart-js/blob/master/messaging/index.html

    // https://firebase.google.com/docs/cloud-messaging/js/receive#handle_messages_when_your_web_app_is_in_the_foreground
    firebase.messaging().onMessage(payload => {
      logger.info('Pushed: ' + JSON.stringify(payload));
      this._eventHandler.emit({ type: 'network.in' });
      this._queryRegistry.invalidate();
    });

    // TODO(burdon): Need to re-register.
    // https://firebase.google.com/docs/cloud-messaging/js/client#monitor-token-refresh
    firebase.messaging().onTokenRefresh(() => {
      logger.warn('FCM Token refreshed.');
    });

    // https://firebase.google.com/docs/cloud-messaging/js/client#request_permission_to_receive_notifications
    return firebase.messaging().requestPermission()
      .then(() => {

        // NOTE: Requires HTTPS (for Service workers); localhost supported for development.
        // https://developers.google.com/web/fundamentals/getting-started/primers/service-workers#you_need_https
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
        logger.warn('FCM registration failed: ' + error.message);
        return null;
      });
  }
}
