//
// Copyright 2016 Minder Labs.
//

'use strict';

export class Command {

  /**
   * Patterns to listen for that trigger the command.
   * See https://github.com/howdyai/botkit#matching-patterns-and-keywords-with-hears
   * @returns {Array} of regexps or keywords.
   */
  patterns() {
    return [];
  }

  /**
   * Comma-separated list of event types to listen to (subject to patterns()).
   * See https://github.com/howdyai/botkit#matching-patterns-and-keywords-with-hears
   * @returns {string}
   */
  eventTypes() {
    return 'direct_message,direct_mention,mention';
  }

  /**
   * Run the command.
   * @param bot
   * @param message, the message that triggered this command.
   * @param databaseContext DatabaseContext
   */
  run(bot, message, databaseContext) {
    // Abstract.
  }

  name() {
    // Override me in children.
    return 'UnknownCommand';
  }

  help() {
    return this.name();
  }
}
