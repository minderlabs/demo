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

    /**
     * Encode URI.
     * @param {string} value
     * @return {string}
     */
    encodeURI: function(value) {
      return encodeURIComponent(value);
    },

    /**
     * Format JSON object.
     * @param {object} object
     * @param {number} indent
     * @return {string}
     */
    json: function(object, indent=0) {
      return JSON.stringify(object, null, indent);
    },

    /**
     * Abridged JSON (e.g., arrays => length only).
     * @param {object} object
     * @param {number} indent
     * @return {string}
     */
    jsonShort: function(object, indent=2) {
      return TypeUtil.stringify(object, indent);
    },

    /**
     * Short (possibly truncated) string.
     * @param {value} value
     * @return {string}
     */
    short: function(value) {
      return TypeUtil.truncate(value, 24);
    },

    /**
     * Human readable string.
     * @param value
     * @return {string}
     */
    time: function(value) {
      return value && moment.unix(value).fromNow();
    }
  }
}
