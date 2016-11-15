//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

import { Chance } from 'chance';

import Database from '../database';

/**
 * Randomizer
 */
export default class Randomizer {

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

  constructor(database, seed=1000) {
    this._database = database;
    this._chance = new Chance(seed);
  }

  generate(type, n, fields={}) {
    console.log('GENERATE[%s]: %d', type, n);

    let items = _.times(n, (i) => {

      // Generate item.
      let item = {
        id: Database.createId(type),
        type: type,
        labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

        ...Randomizer.generators[type](this._chance)
      };

      // Generate fields.
      _.each(fields, (spec, field) => {


        if (this._chance.bool({ likelihood: spec.likelihood * 100 })) {
          let values = this._database.queryItems({type: spec.type});
          if (values.length) {
            let index = this._chance.integer({min: 0, max: values.length - 1});
            let value = values[index];
            item[field] = value.id;
          }
        }
      });

      return item;
    });

    this._database.upsertItems(items);
    return this;
  }
}
