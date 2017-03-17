//
// Copyright 2017 Minder Labs.
//

import { ID } from 'minder-core';

//import { SlackItemSpecParser } from '../parser/parser';

/**
 * Wraps a Database and message/request context for use by botkit command/action handlers.
 */
// NOTE: API queries need to be executed under some valid user, so we use the account of the user who
// created this bot, presumably the administrator. This may cause privacy leaks down the road, we may want
// to introduce a special team account with more restricted permissions for this purpose.
export class DatabaseContext {
  constructor(database, context) {
    this._database = database;
    this._context = context;

    //this._itemSpecParser = new SlackItemSpecParser(this);
  }

  get database() { return this._database; }

  get context() { return this._context; }

  /*
  // TODO(madadam): Needed for AddCommand.
  getItemSpecParser() {
    return this._itemSpecParser;
  }
  */

  /**
   *
   * @param userId Minder userId
   * @returns {Promise} of UserProto.
   */
  getUserFromMinderUserId(userId) {
    // NOTE: problem w/ resolver system again? Need to fetch the whole resolved object, not just the top-level
    // item with references left unresolved.
    // NOTE: This is like AuthManager.getUserFromJWT, except it doesn't have the client-side JWT token, so it
    // doesn't set user.token.
    return this._database.getItem(this._context, 'User', userId);
  }

  getItemByGlobalId(globalId) {
    let { type, id } = ID.fromGlobalId(globalId);
    return this._database.getItem(this._context, type, id);
  }
}

