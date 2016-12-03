//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

/**
 * Item matcher.
 *
 * The matcher is used by both client and server to determine if items match a given filter.
 * Filters are used to screen collections of items, which may be leaf nodes (arrays) of a GraphQL query.
 */
export class Matcher {

  /**
   * Matches the item against the filter.
   *
   * @param filter
   * @param item
   * @returns {boolean} True if the item matches the filter.
   */
  // TODO(burdon): Pass context into matcher.
  matchItem(filter, item) {
//  console.log('MATCH: [%s]: %s', JSON.stringify(filter), JSON.stringify(item));
    console.assert(item);
    if (_.isEmpty(filter)) {
      return false;
    }

    // Could match IDs.
    if (filter.ids && _.indexOf(filter.ids, item.id) != -1) {
      return true;
    }

    // Must match something.
    if (!(filter.type || filter.labels || filter.text || filter.predicate)) {
      return false;
    }

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
      console.assert(filter.predicate.field);
      if (item[filter.predicate.field] != filter.predicate.value) {
        return false;
      }
    }

    // Text match.
    let text = _.lowerCase(filter.text);
    if (text && _.lowerCase(item.title).indexOf(text) == -1) {
      return false;
    }

    return true;
  }

  /**
   * Matches the items against the filter.
   *
   * @param filter
   * @param items
   * @returns {[item]} Array of items that match.
   */
  matchItems(filter, items) {
    return _.compact(_.map(items, item => this.matchItem(filter, item) ? item : false));
  }
}
