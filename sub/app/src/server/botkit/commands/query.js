//
// Copyright 2016 Alien Laboratories, Inc.
//

import { QueryParser } from 'minder-core';

import { Command } from './command';
import { ItemRenderer } from '../renderer/renderer';

export class QueryCommand extends Command {
  constructor() {
    super();
    this.queryParser = new QueryParser();
  }

  help() {
    return 'search|query|show|list|ls [query]: Show items.';
  }

  name() {
    return 'QueryCommand';
  }

  patterns() {
    return ['(search|query|q|show|list|ls|debq) (.*)'];
  }

  run(bot, message, databaseContext) {
    let rawQuery = message.match[2];
    let pretty = message.match[1] !== 'debq';

    let filter = this.queryParser.parse(rawQuery);

    // TODO(madadam): Fake root? The Database API should be independent of graphql resolver stuff.
    let root = {};

    return databaseContext.database.search(databaseContext.context, root, filter)
      .then(results => {
        ItemRenderer.renderResponse(results, databaseContext, pretty).then(renderedResponse => {
          bot.reply(message, renderedResponse);
        });
      })
      .catch(err => {
        let reply = 'Error: ' + err; // TODO(madadam): User-facing error string.
        bot.reply(message, reply);
      });
  }
}
