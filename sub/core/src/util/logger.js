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
// So we bind to window (for the browser) to create a singleton.
//

const levels = {
  ID: new Date().getTime()
};

if (typeof window !== 'undefined' && !window.__LOGGER_LEVELS) {
  window.__LOGGER_LEVELS = levels;
}

function singleton() {
  return typeof window === 'undefined' ? levels : window.__LOGGER_LEVELS;
}

/**
 * Provides configurable logging to console.
 *
 * NOTE: js-logger, etc. does not preserve file/line numbers (we have to bind to console methods directly)
 * and node's debug module is node-only.
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
  // TODO(burdon): Replace with ``.
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
    this._name = name;
    this._prefix = showPrefix ? [`[${name}]`] : [];

    const bind = f => {
      return f.bind(console, ...this._prefix);
    };

    this._log   = bind(console.log);
    this._info  = bind(console.info);
    this._warn  = bind(console.warn);
    this._error = bind(console.error);
  }

  get level() {
    return _.get(singleton(), this._name, _.get(singleton(), '*', Logger.debug));
  }

  get log() {
    return (this.level > Level.log) ? Logger.noop : this._log;
  }

  get info() {
    return (this.level > Level.info) ? Logger.noop : this._info;
  }

  get warn() {
    return (this.level > Level.warn) ? Logger.noop : this._warn;
  }

  get error() {
    return (this.level > Level.error) ? Logger.noop : this._error;
  }
}

module.exports = Logger;
