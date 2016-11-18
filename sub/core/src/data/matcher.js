//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

/**
 * Query matcher.
 */
export class Matcher {

  match(filter, item) {
    let text = _.lowerCase(filter.text);

    // Type match.
    if (filter.type && _.toLower(filter.type) != _.toLower(item.type)) {
      return false;
    }

    // Label match.
    if (!_.isEmpty(filter.labels) && _.intersection(filter.labels, item.labels).length == 0) {
      return false;
    }

    // Predicate match.
    // TODO(burdon): Other operators.
    if (filter.predicate) {
      if (item[filter.predicate.field] != filter.predicate.value) {
        return false;
      }
    }

    // Text match.
    if (text && _.lowerCase(item.title).indexOf(text) == -1) {
      return false;
    }

    // TODO(burdon): Filter option to skip if no positive match.
    return true;
  }
}
