//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Chance } from 'chance';

import Logger from '../util/logger';
import { TypeUtil } from '../util/type';

const logger = Logger.get('randomizer');

/**
 * Randomizer
 */
export class Randomizer {

  // http://chancejs.com

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
   * @param context
   * @param seed        A fixed seed guarantees consistent results for unit tests, etc.
   */
  constructor(itemStore, context={}, seed=1000) {
    console.assert(itemStore);

    // TODO(burdon): Need to fan out to User, etc.
    this._itemStore = itemStore;
    this._context = context;

    this._chance = new Chance(seed);
    this._cache = new Map();
  }

  /**
   * Query the itemStore or return a cached value.
   * @param filter
   * @return {Promise}
   */
  queryCache(filter) {
    let key = JSON.stringify(filter);
    let result = this._cache.get(key);
    if (result) {
      return Promise.resolve(result);
    } else {
      return this._itemStore.queryItems(this._context, {}, filter).then(values => {
        this._cache.set(key, values);
        return values;
      });
    }
  }

  upsertItems(items) {
    return this._itemStore.upsertItems(this._context, items);
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
    return TypeUtil.iterateWithPromises(_.times(n), i => {

      //
      // Generate item.
      //

      let item = {
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

      // Add user bucket.
      if (this._context.group && this._chance.bool({ likelihood: 20 })) {
        item.bucket = this._chance.pickone(this._context.group.members);
      }

      items.push(item);

      //
      // Iterate fields.
      //

      return TypeUtil.iterateWithPromises(fields, (spec, field) => {

        // Set literal value.
        if (spec.likelihood === undefined || this._chance.bool({ likelihood: spec.likelihood * 100 })) {
          // Direct value.
          if (spec.value) {
            item[field] = spec.value;
          } else {
            // Get items for generator's type.
            return this.queryCache({ type: spec.type }).then(values => {
//            console.log('GET[%s]: %d', spec.type, values.length);
              if (values.length) {
                let value = this._chance.pickone(values);
                item[field] = value.id;
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
        if (this._context.created) {
          _.each(items, item => {
            item.created = this._context.created;
            item.modified = this._context.created;
          });
        }

        // Post-create hook.
        return TypeUtil.iterateWithPromises(fields, (spec, field) => {
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
