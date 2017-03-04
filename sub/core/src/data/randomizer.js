//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Chance } from 'chance';

import { Async } from '../util/async';
import { TypeUtil } from '../util/type';

import Logger from '../util/logger';

const logger = Logger.get('randomizer');

/**
 * Randomizer
 */
export class Randomizer {

  /**
   * @param generators
   * @param linkers
   * @param options
   */
  constructor(generators, linkers, options) {
    console.assert(generators && linkers);
    this._generators = generators;
    this._linkers = linkers;
    this._options = _.defaults(options, {
      seed: 1000
    });

    // http://chancejs.com
    this._chance = new Chance(this._options.seed);
  }

  get chance() {
    return this._chance;
  }

  /**
   * Asynchronously generate items of the given type.
   * Optionally provide field plugins that can either directly set values or query for them.
   *
   * @param context
   * @param type
   * @param n
   * @return Promise
   */
  generateItems(context, type, n) {
    logger.log(`GENERATE[${type}]:${n}`);

    return Promise.all(_.times(n, i => {
      // TODO(burdon): Set owner, bucket, etc?
      let item = {
        type
      };

      // Process fields in order (since may be dependent).
      let fields = this._generators[type];
      return Async.iterateWithPromises(fields, (fieldGenerator, field) => {
        return Promise.resolve(fieldGenerator(item, context, this)).then(value => {
          _.set(item, field, value);
          return item;
        });
      });
    }));
  }

  /**
   * Generate link mutations for created items.
   *
   * @param context
   * @param items
   * @returns {*}
   */
  generateLinkMutations(context, items) {
    return Promise.all(_.compact(_.map(items, item => {
      let linker = this._linkers[item.type];
      if (linker) {
        return Promise.resolve(linker(item, context));
      }
    }))).then(itemMutations => {
      // Merge mutations.
      let mutationMap = new Map();
      _.each(_.compact(itemMutations), itemMutation => {
        let currentItemMutation = mutationMap.get(itemMutation.itemId);
        if (currentItemMutation) {
          TypeUtil.maybeAppend(currentItemMutation.mutations, itemMutation.mutations)
        } else {
          mutationMap.set(itemMutation.itemId, itemMutation);
        }
      });

      return Array.from(mutationMap.values());
    });
  }
}
