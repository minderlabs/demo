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
   * @param context
   * @param root
   * @param filter
   * @param item
   * @returns {boolean} True if the item matches the filter.
   */
  // TODO(burdon): Pass context into matcher.
  matchItem(context, root, filter, item) {
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
    if (!(filter.type || filter.labels || filter.text || filter.expr)) {
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

    // Expression match.
    // TODO(burdon): Handle AST.
    if (filter.expr) {
      console.assert(filter.expr.field);

      // TODO(burdon): Handle null.
      let value = filter.expr.value;

      // Substitute value for reference.
      let ref = filter.expr.ref;
      if (ref) {
        // Resolve magic variables.
        // TODO(burdon): These must be available and provided to the client matcher.
        switch (ref) {
          case '$USER_ID': {
            value = context.user.id;
            break;
          }

          default: {
            value = _.get(root, ref);
          }
        }
      }

      // TODO(burdon): Other operators.
      if (_.get(item, filter.expr.field) != value) {
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
   * @param context
   * @param root
   * @param filter
   * @param items
   * @returns {[item]} Array of items that match.
   */
  matchItems(context, root, filter, items) {
    return _.compact(_.map(items, item => this.matchItem(context, root, filter, item) ? item : false));
  }
}
