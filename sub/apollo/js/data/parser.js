//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Use webpack since shared code.
import _ from 'lodash';

/**
 * Query parser.
 */
export default class QueryParser {

  /**
   * Parse text query.
   * @param text Plain text from user
   * @returns {filter}
   */
  parse(text) {
    let filter = {
      labels: [],
      text: ''
    };

    // TODO(burdon): _.words?
    let words = [];
    _.each(text.split(/\s+/), (str) => {

      // Type.
      if (str[0] == '@') {
        filter.type = str.substring(1);
        return;
      }

      // Labels.
      if (str[0] == '#') {
        switch (str.substring(1)) {
          case 'fav': {
            filter.labels.push('_favorite');
            break;
          }
        }
        return;
      }

      // Text
      words.push(str);
    });

    if (words.length) {
      filter.text = words.join(' ');
    }

    return filter;
  }
}
