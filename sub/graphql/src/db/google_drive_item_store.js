//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { ItemStore, Logger } from 'minder-core';

import { Database } from './database';

const logger = Logger.get('db');

class GoogleDriveClient {

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

  search(context, driveQuery, maxResults, processResult, callback, errback) {
    let oauth2Client = this._getOAuthClient(context);
    this._fetchPage(oauth2Client, null, driveQuery, maxResults, processResult, callback, errback);
  }

  _fetchPage(client, pageToken, driveQuery, numResults, processResult, callback, errback=null) {
    if (numResults <= 0) {
      callback();
      return;
    }
    this._drive.files.list(
      {
        auth: client,
        q: driveQuery,
        fields: 'nextPageToken, files(id, name, webViewLink, iconLink)',
        spaces: 'drive',
        pageToken: pageToken
      },
      (err, response) => {
        if (err) {
          logger.error('GoogleDriveClient: ' + err);
          errback && errback(err);
        } else {
          //console.log('** GOOGLE DRIVE results: ' + JSON.stringify(response.files)); // FIXME
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
}

export class GoogleDriveItemStore extends ItemStore {

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
  static resultToItem(file) {
    // TODO(madadam): This makes a transient Item that isn't written into the item store; it's an Item wrapper
    // around foreign data.

    let document = {
      id: Database.IdGenerator.createId(), // TODO(madadam): keep file.id (Google Drive ID) as a foreign key.
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

  constructor(matcher, config) {
    super(matcher);
    this._driveClient = new GoogleDriveClient(config);
  }

  //
  // ItemStore API.
  //

  upsertItems(context, items) {
    // FIXME: Create a separate SearchProvider interface that only support search (queryItems), vs. ItemStore
    // that supports writing.
    console.log('GoogleDriveItemStore does not support upsert.');
    return Promise.resolve(items);
  }

  getItems(context, type, itemIds) {
    console.log('GoogleDriveItemStore does not support getItems.');
    return Promise.resolve([]);
  }

  queryItems(context, root, filter={}, offset=0, count=10) {

    return new Promise((resolve, reject) => {
      let items = [];
      const driveQuery = GoogleDriveItemStore.makeDriveQuery(filter.text);
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
