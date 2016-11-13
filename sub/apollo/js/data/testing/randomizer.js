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

  static generators = {
    'City': (chance) => {
      return {
        title: chance.city(),

        geo: {
          lat: chance.latitude(),
          lng: chance.longitude()
        }
      };
    }
  };

  constructor(database, seed=0) {
    this._database = database;
    this._chance = new Chance(seed);
  }

  generate(type, n) {
    console.log('GENERATE[%s]: %d', type, n);

    let items = _.times(n, (i) => ({
      id: Database.createId(type),
      type: type,
      labels: this._chance.bool({ likelihood: 20 }) ? ['_favorite'] : [],

      ...Randomizer.generators[type](this._chance)
    }));

    this._database.upsertItems(items);
    return this;
  }
}
