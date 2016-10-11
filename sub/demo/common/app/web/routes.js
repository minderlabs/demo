//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

export default class extends Relay.Route {

  static queries = {
    user: () => Relay.QL`
      query {
        user
      }
    `
  };

  static routeName = 'AppHomeRoute';
}
