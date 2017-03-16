//
// Copyright 2017 Minder Labs.
//

import { Command } from './command';
import { ItemRenderer } from '../renderer/renderer';

export class PasteCommand extends Command {
  constructor() {
    super();
  }

  help() {
    return 'paste: Insert the currently active card (in the Minder app) into the channel.';
  }

  name() {
    return 'PasteCommand';
  }

  patterns() {
    return ['(paste)$'];
  }

  run(bot, message, databaseContext) {
    let root = {};

    // TODO(madadam): new DB query to get currently selected item. For now, fake it.
    let filter = {
      type: 'Project',
      text: 'Demo'
    };

    return databaseContext.database.queryItems(databaseContext.context, root, filter)
      .then(results => {
        ItemRenderer.renderResponse(results, databaseContext).then(renderedResponse => {
          bot.reply(message, renderedResponse);
        });
      })
      .catch(err => {
        let reply = 'Error: ' + err; // TODO(madadam): User-facing error string.
        bot.reply(message, reply);
      });
  }
}
