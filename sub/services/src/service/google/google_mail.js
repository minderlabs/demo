//
// Copyright 2016 Minder Labs.
//

import { OAuthServiceProvider } from '../service';

const NAMESPACE = 'google.com/mail';

/**
 * Google Mail Service provider.
 */
export class GoogleMailServiceProvider extends OAuthServiceProvider {

  static SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  constructor(authProvider) {
    super(authProvider, NAMESPACE, GoogleMailServiceProvider.SCOPES);
  }

  get title() {
    return 'Gmail';
  }

  get icon() {
    return '/img/service/google_mail.png';
  }
}
