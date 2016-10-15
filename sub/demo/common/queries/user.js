//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

//
// Application queries.
// NOTE: Query is named for this filename (capitalized).
//

export default {

  user: () => Relay.QL`
    query {
      user(userId: $userId)
    }
  `

};
