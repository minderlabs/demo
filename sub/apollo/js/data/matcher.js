//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Use webpack since shared code.
import _ from 'lodash';

/**
 * Query matcher.
 */
export default class Matcher {

  match(filter, item) {
    let text = _.lowerCase(filter.text);

    // Type match.
    if (filter.type && filter.type != item.type) {
      return false;
    }

    // Label match.
    if (filter.labels && _.intersection(filter.labels, item.labels).length == 0) {
      return false;
    }

    // Text match.
    if (text && _.lowerCase(item.title).indexOf(text) == -1) {
      return false;
    }

    // TODO(burdon): Filter option to skip if no positive match.
    return true;
  }
}
