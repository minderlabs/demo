//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import request from 'request';

import { Logger } from 'minder-core';

const logger = Logger.get('push');

/**
 * Push manager.
 */
export class PushManager {

  constructor(config) {
    console.assert(config);
    this._config = config;
  }

  /**
   * Send push message.
   *
   * @param platform Client platform.
   * @param senderId Client ID of sender.
   * @param messageToken
   * @param force
   * @return {Promise}
   */
  sendMessage(platform, messageToken, senderId, force=false) {
    return new Promise((resolve, reject) => {

      // TODO(burdon): Query invalidation message (see CloudMessenger).
      // NOTE: key x value pairs only.
      // https://firebase.google.com/docs/cloud-messaging/http-server-ref#downstream-http-messages-json
      let data = {
        command: 'invalidate',
        senderId,
        force
      };

      let url;
      if (platform === ``) {
        // https://developers.google.com/cloud-messaging/downstream
        url = 'https://gcm-http.googleapis.com/gcm/send';
      } else {
        // https://firebase.google.com/docs/cloud-messaging/http-server-ref
        url = 'https://fcm.googleapis.com/fcm/send';
      }

      let options = {
        url,

        // https://firebase.google.com/docs/cloud-messaging/server#auth
        // https://github.com/request/request#custom-http-headers
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'key=' + _.get(this._config, 'firebase_server.messagingServerKey')
        },

        body: JSON.stringify({
          // No support for multiple recipients.
          to: messageToken,

          data
        })
      };

      // Post authenticated request to GCM/FCM endpoint.
      // https://firebase.google.com/docs/cloud-messaging/server
      logger.log('Sending message: ' + messageToken, JSON.stringify(data));
      request.post(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          throw new Error(`Messaging Error [${response.statusCode}]: ${error || response.statusMessage}`);
        } else {
          resolve();
        }
      });
    });
  }
}
