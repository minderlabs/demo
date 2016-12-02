//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { Chance } from 'chance';

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
  }

  generate(type, n, fields={}) {
    console.log('GENERATE[%s]: %d', type, n);

    let promises = [];

    let items = _.times(n, (i) => {

      // Generate item.
      let item = {
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

      // Generate fields.
      _.each(fields, (spec, field) => {
        if (this._chance.bool({ likelihood: spec.likelihood * 100 })) {

          // TODO(burdon): Cache queries.
          promises.push(this._database.queryItems(this._context, { type: spec.type }).then(values => {
            if (values.length) {
              let index = this._chance.integer({ min: 0, max: values.length - 1 });
              let value = values[index];
              item[field] = value.id;
            }
          }));
        }
      });

      return item;
    });

    // TODO(burdon): Is there a better way to batch multiple queries?
    // Wait for everything to complete.
    Promise.all(promises).then(() => {
      this._database.upsertItems(this._context, items);
    });

    return this;
  }
}
