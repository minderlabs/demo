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
    if (!(filter.type || filter.bucket || filter.labels || filter.text || filter.expr)) {
      return false;
    }

    // Type match.
    if (filter.type && _.toLower(filter.type) != _.toLower(item.type)) {
      return false;
    }

    // Bucket match
    // TODO(burdon): Buckets should be namespaces in the data store, not field to filter on.
    if (filter.bucket && filter.bucket !== item.bucket) {
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

    // Expression match.
    // TODO(burdon): Handle AST.
    if (filter.expr) {
      if (!Matcher.matchExpression(context, root, filter.expr, item)) {
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

  matchLabels(labels, item) {
    // TODO(madadam): Use predicate tree for negative matching instead of this way to negate labels?
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
   * Recursively match the expression tree.
   *
   * @param context
   * @param root
   * @param expr
   * @param item
   * @returns {boolean}
   */
  static matchExpression(context, root, expr, item) {
    if (expr.op) {
      return Matcher.matchBooleanExpression(context, root, expr, item);
    }

    if (expr.field) {
      return Matcher.matchComparatorExpression(context, root, expr, item);
    }

    throw 'Invalid expression: ' + JSON.stringify(expr);
  }

  /**
   * Recursively match boolean expressions.
   *
   * @param context
   * @param root
   * @param expr
   * @param item
   * @returns {boolean}
   */
  static matchBooleanExpression(context, root, expr, item) {
    console.assert(expr.op);

    let match = false;
    switch (expr.op) {
      case 'OR': {
        _.forEach(expr.expr, (expr) => {
          if (Matcher.matchExpression(context, root, expr, item)) {
            match = true;
            return false;
          }
        });

        return match;
      }

      default: {
        throw 'Invalid operator: ' + JSON.stringify(expr);
      }
    }
  }

  /**
   * Match comparator expressions.
   *
   * @param context
   * @param root
   * @param expr
   * @param item
   * @returns {boolean}
   */
  static matchComparatorExpression(context, root, expr, item) {
    console.assert(expr.field);

    // TODO(burdon): Handle null.
    let value = expr.value;

    // Substitute value for reference.
    let ref = expr.ref;
    if (ref) {
      // Resolve magic variables.
      // TODO(burdon): These must be available and provided to the client matcher.
      switch (ref) {
        case '$USER_ID': {
          console.assert(context.user);
          value = { string: context.user.id };
          break;
        }

        default: {
          value = _.get(root, ref);
          if (ref) {
            // TODO(madadam): Resolve other scalar types.
            value = { string: _.get(root, ref) };
          }
        }
      }
    }

    // TODO(burdon): Other operators.
    if (!Matcher.matchScalarValue(value, _.get(item, expr.field))) {
      return false;
    }

    return true;
  }


  static matchScalarValue(value, scalarValue) {
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

}
