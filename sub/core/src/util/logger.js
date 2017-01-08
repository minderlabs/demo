//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import moment from 'moment';

import { TypeUtil } from './type';

const Level = {
  log:    1,
  debug:  1,
  info:   2,
  warn:   3,
  error:  4
};

//
// With npm-link each module has its own copy of global definitions!
// So we bind to window (for the browser) to create a singleon.
//

const levels = {};

if (typeof window !== 'undefined') {
  window.__LOGGER_LEVELS = levels;
}

function singleton() {
  return typeof window === 'undefined' ? levels : window.__LOGGER_LEVELS;
}

/**
 * Provides configurable logging to console.
 * NOTE: js-logger, etc. does not preserve file/line numbers!
 * So we need to bind console.log directly. Since we want to add a (name) prefix, we break
 * the string substitution so either use backquote substitution `${foo}`, or $$().
 *
 * http://stackoverflow.com/questions/13815640/a-proper-wrapper-for-console-log-with-correct-line-number
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
 */
class Logger {

  static TIMESTAMP = 'hh:mm:ss.SSS';

  static root = new Logger('root');

  static noop() {}

  /**
   * Formats the string.
   * https://developer.mozilla.org/en-US/docs/Web/API/Console#Using_string_substitutions
   * https://developer.mozilla.org/en-US/docs/Web/API/console#Outputting_text_to_the_console
   *
   * @param f
   * @return {string}
   */
  static format(f) {
    let i = 1;
    let args = arguments;
    return String(f).replace(/(%[sdoO]|_TS_)/g, function(x) {
      switch (x) {

        // Replacers.
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%o': return TypeUtil.stringify(args[i++]);
        case '%O': return JSON.stringify(args[i++]);

        // Timestamp.
        case '_TS_': return moment().format(Logger.TIMESTAMP);

        default:
          return x;
      }
    });
  }

  /**
   * Must be called before loggers are constructed (i.e., cannot be dynamic).
   *
   * @param {object} levels
   * @param defLevel
   * @returns {Logger}
   */
  static setLevel(levels, defLevel=Logger.debug) {
    _.assign(singleton(), levels, {
      '*': defLevel
    });

    console.log('Logging: %s', JSON.stringify(singleton()));
  }

  /**
   * Create a named logger.
   *
   * @param name
   * @param showPrefix
   * @returns {Logger}
   */
  static get(name, showPrefix) {
    return new Logger(name, showPrefix);
  }

  static log    = singleton.log;
  static info   = singleton.info;
  static warn   = singleton.warn;
  static error  = singleton.error;

  static Level = Level;

  constructor(name='', showPrefix=true) {
    let prefix = showPrefix ? [`[${name}]`] : [];

    let level = _.get(singleton(), name, _.get(singleton(), '*', Logger.debug));

    this.log    = (level > Level.log)    ? Logger.noop : console.log     .bind(console, ...prefix);
    this.info   = (level > Level.info)   ? Logger.noop : console.info    .bind(console, ...prefix);
    this.warn   = (level > Level.warn)   ? Logger.noop : console.warn    .bind(console, ...prefix);
    this.error  = (level > Level.error)  ? Logger.noop : console.error   .bind(console, ...prefix);
  }
}

module.exports = Logger;
