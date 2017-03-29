//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

/**
 * Client/Server OAuth/JWT utils and defs.
 *
 * Resources:
 * https://www.npmjs.com/package/jsonwebtoken
 * https://www.npmjs.com/package/passport-jwt
 * https://github.com/apollo-passport/apollo-passport
 * https://dev-blog.apollodata.com/a-guide-to-authentication-in-graphql-e002a4039d1
 *
 * Security:
 * https://www.sjoerdlangkemper.nl/2016/09/28/attacking-jwt-authentication/
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Requests_with_credentials
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

  static JWT_SCHEME = 'JWT';

  // momentjs format.
  static JWT_EXPIRATION = [24, 'hours'];

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
      'Authorization': AuthUtil.JWT_SCHEME + ' ' + idToken
    });
  }
}
