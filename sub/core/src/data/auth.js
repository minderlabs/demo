//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

/**
 * Client/Server OAuth/JWT utils and defs.
 */
export class AuthUtil {

  //
  // OpenID Login scopes.
  // https://developers.google.com/identity/protocols/OpenIDConnect#obtaininguserprofileinformation
  //

  static OPENID_LOGIN_SCOPES = [
    'openid',
    'profile',
    'email'
  ];

  //
  // https://myaccount.google.com/permissions
  // https://developers.google.com/identity/protocols/googlescopes
  //

  static GOOGLE_LOGIN_SCOPES = [

    // https://developers.google.com/+/web/api/rest/latest/people/get#response
    'https://www.googleapis.com/auth/plus.me',

    // https://developers.google.com/+/web/api/rest/oauth (includes "profile")
    'https://www.googleapis.com/auth/plus.login',

    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  /**
   * Gets the (JWT) id_token from the request headers.
   * NOTE: Express lowercases all headers.
   *
   * @param headers HTTP request headers.
   * @returns {string} Unverified token or undefined.
   */
  static getIdTokenFromHeaders(headers) {
    console.assert(headers);

    // NOTE: Express headers are lowercase.
    const authHeader = headers['authorization'];
    if (authHeader) {
      console.assert(authHeader);
      let match = authHeader.match(/^JWT (.+)$/);
      console.assert(match, 'Invalid authorization header: ' + authHeader);
      return match[1];
    }
  }

  /**
   * Sets the authorization header from the (JWT) id_token.
   *
   * @param headers HTTP request headers.
   * @param {string} idToken  JWT id_token.
   * @return headers Modified headers.
   */
  static setAuthHeader(headers, idToken) {
    console.assert(_.isString(idToken), 'Invalid JWT token.');

    return _.assign(headers, {
      'authorization': 'JWT ' + idToken
    });
  }
}
