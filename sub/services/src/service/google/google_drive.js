//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import google from 'googleapis';

import { ErrorUtil, QueryProcessor } from 'minder-core';

import { OAuthServiceProvider } from '../service';

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
    // it's an Item wrapper around external data.

    let item = {
      namespace: GoogleDriveQueryProcessor.NAMESPACE,
      type: 'Document',
      id: file.id,
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
    this._config = config;
    this._drive = google.drive('v3');
  }

  // TODO(burdon): Factor out (see oauth.js).
  _getOAuthClient(context) {
    // TODO(madadam): Avoid creating a new OAuth2 client every request. Just pass access token?
    // If not, then cache the clients by context.userId.
    let oauth2Client = new google.auth.OAuth2(
      this._config.clientId,
      this._config.clientSecret
    );

    let credentials = _.get(context, 'credentials.google');
    oauth2Client.setCredentials(_.pick(credentials, ['access_token', 'refresh_token']));
    return oauth2Client;
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
          reject(err.message);
        } else {
          resolve(response);
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

  /**
   * https://developers.google.com/drive/v3/web/search-parameters
   */
  static makeDriveQuery(queryString) {
    return _.isEmpty(queryString) ? null : `fullText contains \'${queryString}\'`;
  }

  constructor(idGenerator, config) {
    super(GoogleDriveQueryProcessor.NAMESPACE);

    this._driveClient = new GoogleDriveClient(idGenerator, config);
  }

  //
  // QueryProcessor API.
  //

  queryItems(context, root={}, filter={}, offset=0, count=QueryProcessor.DEFAULT_COUNT) {
    let driveQuery = GoogleDriveQueryProcessor.makeDriveQuery(filter.text);
    if (!driveQuery) {
      return Promise.resolve([]);
    }

    return this._driveClient.search(context, driveQuery, count).catch(error => {
      throw ErrorUtil.error('Google Drive', error);
    });
  }
}

/**
 * Google Drive Service provider.
 */
export class GoogleDriveServiceProvider extends OAuthServiceProvider {

  static SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  constructor(authProvider) {
    super(authProvider, GoogleDriveQueryProcessor.NAMESPACE, GoogleDriveServiceProvider.SCOPES);
  }

  get title() {
    return 'Google Drive';
  }

  get icon() {
    return '/img/service/google_drive.png';
  }
}
