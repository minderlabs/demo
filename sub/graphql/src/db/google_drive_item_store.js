//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { ItemStore, Logger } from 'minder-core';

const logger = Logger.get('db');

/**
 * Google API client.
 */
class GoogleDriveClient {

  // TODO(burdon): Generalize client.

  constructor(config) {
    this._config = config;
    this._drive = google.drive('v3');
  }

  _getOAuthClient(context) {
    // TODO(madadam): Avoid creating a new OAuth2 client every request. Can't I just pass access token? If not, then
    // cache the clients by context.user.id.
    let oauth2Client = new google.auth.OAuth2(
      this._config.clientId,
      this._config.clientSecret
    );
    oauth2Client.credentials = { access_token: this._getAccessToken(context) };
    return oauth2Client;
  }

  _getAccessToken(context) {
    return _.get(context, 'user.credentials.google_com.accessToken');
  }

  // TODO(burdon): Reimplement callbacks with promises.
  _fetchPage(client, pageToken, driveQuery, numResults, processResult, onSuccess, onError=null) {
    if (numResults <= 0) {
      onSuccess();
      return;
    }

    let query = {
      auth: client,
      q: driveQuery,
      fields: 'nextPageToken, files(id, name, webViewLink, iconLink)',
      spaces: 'drive',
      pageToken: pageToken
    };

    this._drive.files.list(query, (err, response) => {
      if (err) {
        logger.error('GoogleDriveClient: ' + err);
        onError && onError(err);
      } else {
//      console.log('** GOOGLE DRIVE results: ' + JSON.stringify(response.files)); // FIXME
        _.each(response.files, processResult);

        if (response.nextPageToken) {
          this._fetchPage(
            client, response.nextPageToken, driveQuery, numResults - response.files.length, processResult, callback);
        } else {
          callback();
        }
      }
    });
  }

  // TODO(burdon): Reimplement callbacks with promises.
  search(context, driveQuery, maxResults, processResult, onSucces, onError) {
    let oauth2Client = this._getOAuthClient(context);
    this._fetchPage(oauth2Client, null, driveQuery, maxResults, processResult, onSucces, onError);
  }
}

/**
 * Google Drive.
 */
export class GoogleDriveItemStore extends ItemStore {

  // TODO(burdon): Generalize GoogleItemStore.

  static makeDriveQuery(queryString) {
    // https://developers.google.com/drive/v3/web/search-parameters
    return _.isEmpty(queryString) ? null : `fullText contains \'${queryString}\'`;
  }

  /**
   * Convert Drive result to a schema object Item.
   * @param file Google Drive file result.
   * @returns Item
   * @private
   */
  static resultToItem(idGenerator, file) {
    // TODO(madadam): This makes a transient Item that isn't written into the item store; it's an Item wrapper
    // around foreign data.

    let document = {
      id: idGenerator.createId(), // TODO(madadam): keep file.id (Google Drive ID) as a foreign key.
      title: file.name,
      source: 'Google Drive',
      type: 'Document',
    };

    if (file.webViewLink) {
      document.url = file.webViewLink;
    }
    if (file.iconLink) {
      document.iconUrl = file.iconLink;
    }

    return document;
  }

  constructor(idGenerator, matcher, config) {
    super(idGenerator, matcher);

    this._driveClient = new GoogleDriveClient(config);
  }

  //
  // ItemStore API.
  //

  // TODO(burdon): QueryProcessor interface.

  upsertItems(context, items) {
    throw 'Not Supported';
  }

  getItems(context, type, itemIds) {
    throw 'Not Supported';
  }

  queryItems(context, root, filter={}, offset=0, count=10) {

    return new Promise((resolve, reject) => {
      let items = [];

      // TODO(burdon): Reimplement callbacks with promises.
      let driveQuery = GoogleDriveItemStore.makeDriveQuery(filter.text);
      if (!driveQuery) {
        resolve(items);
      } else {
        this._driveClient.search(context, driveQuery, count,
          (result) => {
            items.push(GoogleDriveItemStore.resultToItem(result));
          },
          () => {
            resolve(items);
          },
          (err) => {
            reject(err);
          }
        );
      }
    });
  }
}
