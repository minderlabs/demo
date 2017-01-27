//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { Defs, ItemUtil } from 'nx/data';

import { RenderParseHelper } from './render_parse.js'

/**
 * Encapsulate user-specific state, and logic for making API calls for a specific user.
 * Includes the Database connection, query results, undo history.
 */
export class UserState {

  constructor(userInfo, database, bot) {
    this.userInfo = userInfo;
    this.database = database;
    this.bot = bot;

    this.renderParseHelper = new RenderParseHelper(this);

    // Results of the user's last query.
    this.queryResult = null;

    // Item history for undo.
    this.itemHistory = [];

    // Limit history to N objects.
    //
    // Note, no better way to declare class variables:
    // http://stackoverflow.com/questions/22528967/es6-class-variable-alternatives
    this.MAX_HISTORY_LENGTH = 10;

    // Map of items assigned to this user or by this user, keyed by itemId.
    this.assignedTasks = {};

    this.createSubscriptions();
  }

  getRenderParseHelper() {
    return this.renderParseHelper;
  }

  createSubscriptions() {
    let subscribe = true;
    let self = this;

    // Tasks assigned to me:
    this.sendQuery(
      {
        predicate: {
          type: 'task',
          dataType: 'nexus.data.type.Task',
          field: 'assignedToUserId',
          comparator: 'EQ',
          token: 'CURRENT_USER'
        }
      },
      function(queryResult) {
        // Look for newly assigned tasks. No diff in subscription yet, so need to keep a cache
        // of known assigned tasks, and do the diff.
        for (let item of queryResult.item || []) {
          if (self.isTask(item) && self.isNewOrChanged(item)) {
            self.trackTask(item);
            self.onTaskChange(item);
          }
        }
      },
      null,
      subscribe
    );

    // Tasks assigned by me:
    this.sendQuery(
      {
        predicate: {
          type: 'task',
          dataType: 'nexus.data.type.Task',
          field: 'assignedByUserId',
          comparator: 'EQ',
          token: 'CURRENT_USER'
        }
      },
      function(queryResult) {
        // Look for newly assigned tasks. No diff in subscription yet, so need to keep a cache
        // of known assigned tasks, and do the diff.
        for (let item of queryResult.item || []) {
          if (self.isTask(item) && self.isNewOrChanged(item)) {
            self.trackTask(item);
            self.onTaskChange(item);
          }
        }
      },
      null,
      subscribe
    );
  }

  trackTask(item) {
    this.assignedTasks[item.key.id] = item;
  }

  isTask(item) {
    let task = ItemUtil.getData(item, Defs.TYPE.task);
    return task != null;
  }

  isNewOrChanged(newItem) {
    let item = this.assignedTasks[newItem.key.id];
    if (!item) {
      return true;
    } else if (('modified' in newItem && !('modified' in item)) || newItem.modified > item.modified) {
      return true;
    } else {
      return false;
    }
  }

  onTaskChange(item) {
    let self = this;
    this.bot.startPrivateConversation({user: this.userInfo.id}, function(err, convo) {
      if (err) {
        console.log(err);
      } else {
        let isPretty = true;
        let msg = self._messageForItem(item);
        let renderer = self.renderParseHelper.getItemRenderer(item, isPretty);
        renderer.renderItem().then(function(renderedItem) {
          let message = {
            text: msg,
            attachments: [renderedItem]
          };
          convo.say(message);
        });
      }
    });
  }

  _messageForItem(item) {
    let task = ItemUtil.getData(item, Defs.TYPE.task);
    if (task && task.status == 'DONE') {
      return 'Task complete:';
    } else {
      return 'New task!';
    }
  }

  sendQuery(queryProto, callback, errback=null, subscribe=false) {
    let queryCallback = callback;
    if (!subscribe) {
      // Cache query results for one-off queries.
      let self = this;
      queryCallback = function(queryResult) {
        self.queryResult = queryResult;
        callback(queryResult);
      };
    }

    if (!errback) {
      errback = function(err) {
        console.log('ERROR: ' + JSON.stringify(err));
      };
    }

    if (subscribe) {
      return this.database.createQuery(queryCallback, errback).subscribe().update(queryProto);
    } else {
      return this.database.createQuery(queryCallback, errback).update(queryProto);
    }
  }

  commitMutation(item, callback) {
    return this.database.createMutation(callback)
      .addItem(item)
      .commit();
  }

  pushHistory(item) {
    this.itemHistory.push(item);
    if (this.itemHistory.length > this.MAX_HISTORY_LENGTH) {
      this.itemHistory.shift();
    }
  }

  popHistory() {
    return this.itemHistory.pop();
  }
}

