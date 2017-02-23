//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Chance } from 'chance';

import { Async } from '../util/async';
import Logger from '../util/logger';

const logger = Logger.get('randomizer');

/**
 * Randomizer
 */
export class Randomizer {

  /**
   * Default property generators.
   */
  static generators = {

    'Task': chance => {
      return {
        title: chance.sentence({ words: chance.natural({ min: 3, max: 5 }) }),
        description: chance.sentence({ words: chance.natural({ min: 10, max: 20 }) })
      }
    },

    'Contact': chance => {
      return {
        title: chance.name()
      }
    },

    'Place': chance => {
      return {
        title: chance.city(),

        geo: {
          lat: chance.latitude(),
          lng: chance.longitude()
        }
      };
    }
  };

  /**
   *
   * @param itemStore
   * @param queryItems
   * @param options
   */
  constructor(itemStore, queryItems, options) {
    console.assert(itemStore && queryItems);

    this._itemStore = itemStore;
    this._queryItems = queryItems;
    this._options = _.defaults(options, {
      seed: 1000
    });

    // http://chancejs.com
    this._chance = new Chance(this._options.seed);

    // Map of values by type.
    this._cache = new Map();
  }

  get chance() {
    return this._chance;
  }

  /**
   * Query the itemStore or return a cached value.
   * @param type
   * @return {Promise}
   */
  queryCache(type) {
    console.assert(type);
    let result = this._cache.get(type);
    if (result) {
      return Promise.resolve(result);
    } else {
      return this._queryItems(type).then(values => {
        this._cache.set(type, values);
        return values;
      });
    }
  }

  upsertItems(items) {
    return this._itemStore.upsertItems({}, items);
  }

  /**
   * Asynchronously generate items of the given type.
   * Optionally provide field plugins that can either directly set values or query for them.
   *
   * @param type
   * @param n
   * @param fields
   * @return Promise
   */
  generate(type, n, fields={}) {
    logger.log(`GENERATE[${type}]:${n}`);

    let items = [];

    // Each item is generates asynchronously (since it may look-up other items) so we gather the promises.
    return Async.iterateWithPromises(_.times(n), i => {

      //
      // Generate item.
      //

      let item = {
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

      items.push(item);

      //
      // Iterate fields.
      //

      return Async.iterateWithPromises(fields, (spec, field) => {

        // Set literal value.
        if (spec.likelihood === undefined || this._chance.bool({ likelihood: spec.likelihood })) {
          // Direct value.
          if (_.isFunction(spec)) {
            item[field] = spec();
          } else {
            // Get items for generator's type.
            return this.queryCache(spec.type).then(values => {
              if (values.length) {
                let value = this._chance.pickone(values);
                item[field] = value.id;
              } else {
                logger.warn('No values for: ' + JSON.stringify(spec.type));
              }
            });
          }
        }
      });
    }).then(() => {

      // Insert array of items.
      return this.upsertItems(items).then(items => {

        // TODO(burdon): Should happen before upsert.
        // Fake timestamps (so don't show up in inbox).
        let created = this._options.created
        if (created) {
          _.each(items, item => {
            item.created = created;
            item.modified = created;
          });
        }

        // Post-create hook.
        return Async.iterateWithPromises(fields, (spec, field) => {
          if (spec.onCreate) {
            return spec.onCreate(this, items);
          }
        }).then(() => {
          return items;
        });
      });
    });
  }
}
