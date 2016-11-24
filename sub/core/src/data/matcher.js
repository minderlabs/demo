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
//  console.log('MATCH: [%s]: %s', JSON.stringify(filter), JSON.stringify(item));

    // Type match.
    if (filter.type && _.toLower(filter.type) != _.toLower(item.type)) {
      return false;
    }

    // Deleted.
    if (_.indexOf(item.labels, '_deleted') != -1 &&
        _.indexOf(filter.labels, '_deleted') == -1) { // TODO(burdon): Const.
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

    // Must match something.
    if (filter.strict && !filter.text) {
      return false;
    } else {
      // Text match.
      let text = _.lowerCase(filter.text);
      if (text && _.lowerCase(item.title).indexOf(text) == -1) {
        return false;
      }
    }

    return true;
  }
}
