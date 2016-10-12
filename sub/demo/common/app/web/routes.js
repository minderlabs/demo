//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

export default class extends Relay.Route {
  static queries = {
    viewer: () => Relay.QL`query { viewer }`,
  };

  static routeName = 'AppHomeRoute';
}
