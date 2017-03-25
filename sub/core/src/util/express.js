//
// Copyright 2017 Minder Labs.
//

import moment from 'moment';

import { TypeUtil } from './type';

/**
 * Node express utils.
 * NOTE: No sever deps.
 *
 * https://github.com/helpers/handlebars-helpers
 */
export class ExpressUtil {

  static Helpers = {

    /**
     * Inject content from other template.
     * @param name
     * @param options
     */
    section: function(name, options) {
      // Map of sections.
      if (!this.sections) {
        this.sections = {};
      }

      this.sections[name] = options.fn(this);
    },

    json: function(object, indent=0) {
      return JSON.stringify(object, null, indent);
    },

    jsonShort: function(object, indent=2) {
      return TypeUtil.stringify(object, indent);
    },

    short: function(object) {
      return TypeUtil.truncate(object, 24);
    },

    time: function(object) {
      return object && moment.unix(object).fromNow();
    }
  }
}
