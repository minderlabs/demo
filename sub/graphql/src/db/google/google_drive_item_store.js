//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { QueryProcessor, Logger } from 'minder-core';

const logger = Logger.get('google.drive');

/**
 * Google API client.
 */
class GoogleDriveClient {

  // TODO(burdon): Generalize client.

  /**
   * Convert Drive result to a schema object Item.
   *
   * @param idGenerator
   * @param file Google Drive file result.
   * @returns Item
   * @private
   */
  static resultToItem(idGenerator, file) {
    // TODO(madadam): This makes a transient Item that isn't written into the item store;
    // it's an Item wrapper around foreign data.

    let item = {
      namespace: GoogleDriveQueryProcessor.NAMESPACE,
      type: 'Document',
      id: idGenerator.createId(), // TODO(madadam): keep file.id (Google Drive ID) as a foreign key.
      title: file.name
    };

    if (file.webViewLink) {
      item.url = file.webViewLink;
    }
    if (file.iconLink) {
      item.iconUrl = file.iconLink;
    }

    return item;
  }

  constructor(idGenerator, config) {
    this._idGenerator = idGenerator;
    this._serverProvider = config;
    this._drive = google.drive('v3');
  }

  _getOAuthClient(context) {
    // TODO(madadam): Avoid creating a new OAuth2 client every request. Just pass access token?
    // If not, then cache the clients by context.user.id.
    let oauth2Client = new google.auth.OAuth2(
      this._serverProvider.clientId,
      this._serverProvider.clientSecret
    );
    oauth2Client.credentials = { access_token: this._getAccessToken(context) };
    return oauth2Client;
  }

  _getAccessToken(context) {
    return _.get(context, 'user.credentials.google_com.accessToken');
  }

  /**
   * Fetches a single page of results.
   */
  _fetchPage(client, driveQuery, numResults, pageToken=undefined) {
    return new Promise((resolve, reject) => {
      let query = {
        auth: client,
        q: driveQuery,
        fields: 'nextPageToken, files(id, name, webViewLink, iconLink)',
        spaces: 'drive',
        pageToken: pageToken
      };

      this._drive.files.list(query, (err, response) => {
        if (err) {
          logger.error('Query failed: ' + err);
          reject(err);
        } else {
          return resolve(response);
        }
      });
    });
  }

  /**
   * Recursively fetches pages for the specified number of results.
   */
  _fetchAll(client, driveQuery, maxResults, pageToken=undefined) {
    if (maxResults == 0) {
      return Promise.resolve([]);
    }

    // Collect the results.
    let results = [];

    // Get the next page.
    return this._fetchPage(client, driveQuery, maxResults, pageToken).then(response => {
      // Add results.
      _.each(response.files, file => results.push(GoogleDriveClient.resultToItem(this._idGenerator, file)));

      // Maybe get more (recursively).
      if (response.nextPageToken) {
        return this._fetchAll(client, driveQuery, maxResults - response.files.length, response.nextPageToken);
      }

      return results;
    });
  }

  /**
   * Returns items for each document that matches the query.
   *
   * @param context
   * @param driveQuery
   * @param maxResults
   * @return {*}
   */
  search(context, driveQuery, maxResults) {
    let oauth2Client = this._getOAuthClient(context);
    return this._fetchAll(oauth2Client, driveQuery, maxResults);
  }
}

/**
 * Google Drive.
 */
export class GoogleDriveQueryProcessor extends QueryProcessor {

  static NAMESPACE = 'google.com/drive';

  static makeDriveQuery(queryString) {
    // https://developers.google.com/drive/v3/web/search-parameters
    return _.isEmpty(queryString) ? null : `fullText contains \'${queryString}\'`;
  }

  constructor(idGenerator, matcher, config) {
    super(idGenerator, matcher);

    this._driveClient = new GoogleDriveClient(idGenerator, config);
  }

  //
  // QueryProcessor API.
  //

  get namespace() {
    return GoogleDriveQueryProcessor.NAMESPACE;
  }

  queryItems(context, root, filter={}, offset=0, count=10) {
    let driveQuery = GoogleDriveQueryProcessor.makeDriveQuery(filter.text);
    if (!driveQuery) {
      return Promise.resolve([]);
    }

    return this._driveClient.search(context, driveQuery, count);
  }
}
