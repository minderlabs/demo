//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { Defs, ItemUtil, QueryParser } from 'nx/data';

import { BotManager } from './bot_manager'
import { UserStateManager } from './user_state_manager'

import { ActionDispatcher } from '../commands/action'
import { AddCommand } from '../commands/add';
import { DeleteCommand } from '../commands/delete';
import { QueryCommand } from '../commands/query';
import { SearchCommand } from '../commands/search';
import { UndoCommand } from '../commands/undo';

// TODO(madadam): keep mutationCallback DRY, refactor.

// TODO(madadam): Unify all command parsing into one parser; use a single controller.hears clause. Or maybe
// let the parser do the "hearing", so we can dispatch commands and other ingestion operations more robustly
// than regex match.

// TODO(madadam): More actions:
// - archive
// - share|send, as followup after query:
//   "share that with @rich", "send that to @rich", or just "send @rich".
//   "send [ref] to @rich" (index ref)
// - edit|open [ref], same as button, opens item in app/crx.
// - subscribe [ref]
// - done [ref]
// - remind me to do [ref] [time spec], e.g. "remind me to do 3 next thursday"

// TODO(madadam): Subscriptions, deliver notifications.


/**
 * Main logic for the bot.
 */
export class App {

  constructor(controller) {
    this.controller = controller;
    this.userStateManager = new UserStateManager(controller, _.get(process.env, 'apiBase'));

    this.botManager = new BotManager(this.userStateManager);
    this.botManager.init(controller);

    this.actionDispatcher = new ActionDispatcher();

    // Registered commands.
    this.commands = [
      new AddCommand(),
      new DeleteCommand(),
      new QueryCommand(),
      new SearchCommand(),
      new UndoCommand()
    ];
  }

  /**
   * Start listening for bot events.
   */
  start() {
    let self = this;

    console.log('*** APP START!'); // FIXME

    // Simple ping for testing.
    this.controller.hears('hello', 'direct_message', function(bot, message) {
      console.log('Message: ' + JSON.stringify(message));
      bot.reply(message, 'hi there');
    });

    for (let command of this.commands) {
      this.controller.hears(command.patterns(), command.eventTypes(), function(bot, message) {
        self.userStateManager.getUserState(message.user, bot).then(function(userState) {
          try {
            command.run(bot, message, userState);
          } catch(err) {
            console.log('Error running ' + command.name() + ': ' + err);
            bot.reply(message, "Sorry, that didn't work.");
          }
        });
      });
    }

    this.controller.hears(['help$'], 'direct_message,direct_mention,mention', function(bot, message) {
      bot.reply(message, "working..."); // FIXME
      self.userStateManager.getUserState(message.user, bot).then(function(userState) {
        // TODO(madadam): Contextualize help based on recent history, selected items, etc.?

        // TODO(madadam): Also get help strings from Actions.
        let helpStrings = [];
        for (let command of self.commands) {
          helpStrings.push('  * ' + command.help());
        }
        let usage = _.join(helpStrings, "\n");
        bot.reply(message, 'After selecting one or more items, you can take the following actions:\n' + usage);
      });
      try {
      } catch (err) {
        bot.reply(message, "ERROR: " + err); // FIXME
      }
    });

    this.controller.on('interactive_message_callback', function(bot, message) {
      // console.log('Received message button callback:\n' + JSON.stringify(message, null, 2));
      self.userStateManager.getUserState(message.user, bot).then(function(userState) {
        self.actionDispatcher.run(bot, message, userState);
      });
    });

    // TODO(madadam): Decide what to use slash commands for, if anything.
    this.controller.on('slash_command', function(bot, message) {
      console.log('Slash command Message: ' + JSON.stringify(message));
      bot.reply(message, 'hi from slash command');
    });

  }
}
