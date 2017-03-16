//
// Copyright 2016 Minder Labs.
//

// TODO(madadam): Fix interactive buttons. Getting error:
// error: Could not load team while processing webhook:  Error: could not load data
//    at /Users/madadam/work/react-demos/sub/app/node_modules/jfs/lib/Store.js:209:15

export class Action {
  run(bot, message, item, databaseContext) {
    // Abstract.
  }
}

// TODO(madadam): DoneAction that hooks up 'Done' button to a mutation.

// TODO(madadam): EditAction --> opens up in CRX.
class EditAction extends Action {
  run(bot, message, item, context) {
    bot.reply(message, 'Opening item ' + item.id);
  }
}

/**
 * Dispatch on incoming interactive message button actions to take appropriate action.
 */
export class ActionDispatcher {
  constructor() {
    this.actions = {
      //'done': DoneAction,
      'edit': EditAction
    }
  }

  /**
   *
   * @param bot
   * @param message
   * @param databaseContext DatabaseContext
   */
  run(bot, message, databaseContext) {
    _.each(message.actions, action => {
      let actionClass = this.actions[action.name];
      if (!actionClass) {
        // 500
        // TODO(madadam): Nice error messages.
        bot.reply(message, 'Error: unknown action ' + action.name)
        return;
      }

      // Get item by callback_id from the Database.
      // TODO(madadam): this means that only a user with a valid database connection can click buttons. Other
      // users on the team can see the items but button clicks will fail. Is this OK?
      let globalId = message.callback_id;
      databaseContext.getItemByGlobalId(globalId)
        .then(item => {
          if (!item) {
            bot.reply(message, "Hm, I lost track of the item you clicked on, try querying again.");
            return;
          }
          let actionObj = new actionClass();
          actionObj.run(bot, message, item, databaseContext);
        });
    });
  }
}
