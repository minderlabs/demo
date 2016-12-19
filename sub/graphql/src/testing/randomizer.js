//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Chance } from 'chance';

import { Logger, TypeUtil } from 'minder-core';

const logger = Logger.get('randomizer');

/**
 * Randomizer
 */
export class Randomizer {

  // http://chancejs.com

  static generators = {

    'Task': chance => {
      return {
        title: chance.sentence({ words: 5 })
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

  constructor(database, context, seed=1000) {
    console.assert(database && context);

    this._database = database;
    this._context = context;
    this._chance = new Chance(seed);
    this._cache = new Map();
  }

  /**
   * Query the database or return a cached value.
   * @param filter
   * @return {Promise}
   */
  queryCache(filter) {
    let key = JSON.stringify(filter);
    let result = this._cache.get(key);
    if (result) {
      return Promise.resolve(result);
    } else {
      // TODO(burdon): Generalize for more general database use?
      return this._database.queryItems(this._context, {}, filter).then(values => {
        this._cache.set(key, values);
        return values;
      });
    }
  }

  /**
   *
   * @param type
   * @param n
   * @param fields
   * @return Promise
   */
  generate(type, n, fields={}) {
    logger.log(`GENERATE[${type}]:${n}`);

    let items = [];

    // Create values.
    return TypeUtil.iterateWithPromises(_.times(n), i => {

      // Generate item.
      let item = {
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

      // Add user bucket.
      if (this._chance.bool({ likelihood: 20 })) {
        item.bucket = this._chance.pickone(this._context.group.members);
      }

//    console.log('Item: %s', JSON.stringify(item));
      items.push(item);

      // Iterate fields.
      return TypeUtil.iterateWithPromises(fields, (spec, field) => {

        // Get items for generator's filter.
        return this.queryCache({ type: spec.type }).then(values => {
          if (values.length) {
            let index = this._chance.integer({ min: 0, max: values.length - 1 });
            let value = values[index];
            item[field] = value.id;
          }
        });
      });
    }).then(() => {

      // Insert vector of items.
      return this._database.upsertItems(this._context, items).then(items => {

        // Fake timestamps (so don't show up in inbox).
        if (this._context.created) {
          _.each(items, item => {
            item.created = this._context.created;
            item.modified = this._context.created;
          });
        }

        return items;
      });
    });
  }
}
