//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Multi-part key formatter and parser.
 *
 * Formats and parses structured keys.
 *
 * Example: new Key('I:{{type}}:{{itemId}}').toKey({type: 'User', itemId: '123'});
 */
export class Key {

  // https://medium.com/@daffl/beyond-regex-writing-a-parser-in-javascript-8c9ed10576a6#.p781xntvx
  static REGEX = /\{{2}\s*((\w|\.)+)\s*\}{2}/g;

  constructor(pattern) {
    console.assert(pattern);

    // Formatter pattern.
    this._pattern = pattern;

    // Create the parser.
    // E.g., 'I:{{type}}:{{itemId}}' => 'I:(.+):(.+)'
    this._parser = new RegExp(pattern.replace(/\{\{.+?\}\}/g, '(.+)'));
  }

  /**
   * Uses pattern to format key from args.
   *
   * @param {object} args Creates wildcard key if null or missing args.
   * @returns {string}
   */
  toKey(args={}) {
    // Make sure no args are nil.
    _.each(args, (value, arg) => console.assert(!_.isNil(value), 'Invalid arg: ' + arg));
    return this._pattern.replace(Key.REGEX, (match, group) => {
      // Wildcard for args not-specified.
      // TODO(burdon): '*' is Redis specific. Make this an option (otherwise assert).
      return _.get(args, group, '*');
    });
  }

  /**
   * Parses key into args.
   *
   * @param {string} key
   * @returns {object}
   */
  fromKey(key) {
    console.assert(key);

    // Parse the key.
    let parts = key.match(this._parser);

    // Use replace to iterate arg keys.
    let i = 1;
    let args = {};
    this._pattern.replace(Key.REGEX, (match, group) => {
      args[group] = parts[i++];
    });

    return args;
  }
}
