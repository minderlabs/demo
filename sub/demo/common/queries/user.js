//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

//
// Application queries.
// NOTE: Query is named for this filename (capitalized).
//

// TODO(burdon): PyCharm plugin.
// https://github.com/jimkyndemeyer/js-graphql-intellij-plugin/issues/32

export default {

  user: () => Relay.QL`
    query {
      user(userId: $userId)
    }
  `

};
