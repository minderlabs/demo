//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { Chance } from 'chance';

import { TypeUtil } from 'minder-core';

/**
 * Randomizer
 */
export class Randomizer {

  // http://chancejs.com

  static generators = {

    'Task': (chance) => {
      return {
        title: chance.sentence({ words: 5 })
      }
    },

    'Contact': (chance) => {
      return {
        title: chance.name()
      }
    },

    'Place': (chance) => {
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
    console.log('GENERATE[%s]: %d', type, n);

    let items = [];

    // Create values.
    return TypeUtil.iterateWithPromises(_.times(n), (i) => {

      // Generate item.
      let item = {
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

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
      return this._database.upsertItems(this._context, items);
    });
  }
}
