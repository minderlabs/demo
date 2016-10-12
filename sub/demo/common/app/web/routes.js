//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

/**
 * Query entry points (not URL routing).
 * https://facebook.github.io/relay/docs/api-reference-relay-route.html
 */
export default class extends Relay.Route {

  // Referenced by ReactDOM.render(<Relay.Renderer queryConfig={ new DemoAppHomeRoute() }/>);
  static routeName = 'DemoAppHomeRoute';

  static queries = {
    user: () => Relay.QL`
      query {
        user
      }
    `
  };
}
