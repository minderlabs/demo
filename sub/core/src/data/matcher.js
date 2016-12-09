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
    // console.log('MATCH: [%s]: %s', JSON.stringify(filter), JSON.stringify(item));
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

    // Bucket match
    // TODO(burdon): Buckets should be namespaces in the data store, not field to filter on.
    if (filter.bucket) {
      console.log('** FILTER.bucket ' + filter.bucket + ' item.bucket: ' + item.bucket); // FIXME
    }
    if (filter.bucket && filter.bucket != item.bucket) {
      return false;
    }

    // Deleted.
    if (_.indexOf(item.labels, '_deleted') != -1 &&
        _.indexOf(filter.labels, '_deleted') == -1) { // TODO(burdon): Const.
      return false;
    }

    // Label match.
    if (!this.matchLabels(filter.labels, item)) {
      return false;
    }

    // Predicate match.
    // TODO(burdon): Other operators.
    if (filter.predicate) {
      console.assert(filter.predicate.field);
      if (!this.matchValue(filter.predicate.value, item[filter.predicate.field])) {
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

  matchValue(value, scalarValue) {
    // Hack: Use empty string to match undefined fields.
    if (value.string === "" && scalarValue == undefined) {
      return true;
    }
    if (value.string !== undefined) {
      return value.string === scalarValue;
    }
    if (value.int !== undefined) {
      return value.int == scalarValue;
    }
    if (value.float !== undefined) {
      return value.float == scalarValue;
    }
    if (value.boolean !== undefined) {
      return value.boolean == scalarValue;
    }
    return false;
  }

  matchLabels(labels, item) {
    // TODO(madadam): Use predicate tree for negative matching instead of this hack.
    const posLabels = _.filter(labels, (label) => { return !_.startsWith(label, '!') });
    const negLabels = _.map(
        _.filter(labels, (label) => { return _.startsWith(label, '!') }),
        (label) => { return label.substring(1)});
    if (!_.isEmpty(posLabels) && _.intersection(posLabels, item.labels).length == 0) {
      return false;
    }
    if (!_.isEmpty(negLabels) && _.intersection(negLabels, item.labels).length > 0) {
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
