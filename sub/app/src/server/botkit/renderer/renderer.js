//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { ID, TypeUtil } from 'minder-core';

import { TASK_LEVELS } from '../../../common/defs'

const IS_SHORT_FIELD = true;

// TODO(burdon): Const.
const SYSTEM_LABELS = ['_deleted', '_favorite'];


// TODO(madadam): Rewrite this as a fluent Builder?
// new ItemRenderer(item).addLabel(..).addButton(..).render();
// Or just get rid of all the static helper methods

/**
 * Renders an item as a Slack message attachment as json.
 */
export class ItemRenderer {

  /**
   * Render a list of items from a query result into a json message with an attachment per item.
   *
   * @param items array from Database
   * @param databaseContext DatabaseContext
   * @param pretty
   * @returns Promise(jsonResponse) slack message with attachments.
   */
  static renderResponse(items, databaseContext, pretty=true) {
    let jsonResponse = {
      response_type: 'in_channel',
      text: 'Query results:'
    };

    let attachments = _.map(items, (item, i) => {
      let renderer = new ItemRenderer(item, databaseContext, pretty, i);
      return renderer.renderItem();
    });
    return Promise.all(attachments).then(results => {
      if (results.length > 0) {
        jsonResponse.attachments = results;
      }
      return jsonResponse;
    });
  }

  constructor(item, databaseContext, pretty = true, index=null) {
    console.assert(item);
    this._item = item;
    this._databaseContext = databaseContext;
    this._index = index;
    this._pretty = pretty;

    // https://api.slack.com/docs/message-formatting#message_formatting
    this.result = {
      fallback: item.title,
      title: this._getTitle(),
      title_link: item.url || '',
      mrkdwn_in: ['text']
    };

    this._colorItem();

    TypeUtil.maybeSet(this.result, 'footer', this._getFooter());
  }

  // Render an item, returning a Promise.
  renderItem() {
    if (this._pretty) {
      return this.renderPretty();
    } else {
      return this.renderRaw();
    }
  }

  renderRaw() {
    this.result.text = _.join(['```', JSON.stringify(this._item, null, 2), '```'], '');
    return Promise.resolve(this.result);
  }

  renderPretty() {
    // https://api.slack.com/docs/message-formatting#message_formatting
    let item = this._item;
    let result = this.result;

    TypeUtil.maybeSet(result, 'text', _.get(item, 'description'));
    TypeUtil.maybeSet(result, 'footer', _.get(item, 'source'));
    TypeUtil.maybeSet(result, 'footer_icon', _.get(item, 'iconUrl'));
    TypeUtil.maybeSet(result, 'thumb_url', _.get(item, 'thumbnailUrl'));

    ItemRenderer._maybeAddField(result, 'Labels', _.join(this._filterLabels(_.get(item, 'labels')), ", "), IS_SHORT_FIELD);

    this._addButton('edit', 'Edit');

    let promises = [];

    if (item.type === 'Task') {
      if (_.get(item, 'status') == TASK_LEVELS.COMPLETE) {
        ItemRenderer._maybeAddField(result, 'Status', 'Done', IS_SHORT_FIELD);
        TypeUtil.maybeSet(this.result, 'color', 'good');
      } else {
        this._addButton('done', 'Done', 'primary');
      }
      if (item.assignee) {
        promises.push(this._formatUserId(item.assignee)
          .then(formattedUser => {
            ItemRenderer._maybeAddField(result, 'Assigned To', formattedUser, IS_SHORT_FIELD);
          }));
      }
      if (item.dueDate) {
        // TODO(madadam): Port DateUtil from nx/util
        //ItemRenderer._maybeAddField(result, 'Due', DateUtil.formatDateTime(task.dueDate), IS_SHORT_FIELD);
      }
    }

    if (result.actions) {
      // For interactive buttons.
      result.callback_id = ID.toGlobalId(item.type, item.id);
    }

    return Promise.all(promises)
      .then(resolvedPromises => {
        return result;
      });
  }

  static _maybeAddField(result, name, val, isShort=false) {
    if (val) {
      let field = {
        title: name,
        value: val,
        short: isShort
      };
      TypeUtil.getOrSet(result, 'fields', []).push(field);
    }
  }

  _getTitle() {
    return this._item.title;
  }

  // TODO(madadam): Dead code? Decide if we still want this index-based selection mechanism, or delete.
  _getFooter() {
    let parts = [];
    if (this._index > 0 || this._index == 0) { // JS WTF: null >= 0 is true.
      // TODO(madadam): less geeky affordance that describes what index is for. Alias, short name, nickname, number?
      //parts.push('Index: ' + this._index);
    }
    if (!this._pretty) {
      // Debug mode, add system labels to footer.
      let systemLabels = _.filter(this._item.labels, label => { return label && label[0] == '_'});
      systemLabels = _.map(systemLabels, label => { return label.substring(1); });
      parts.push('System labels: ' + _.join(systemLabels, ", "));
    }
    return _.join(parts, ", ");
  }

  _addButton(name, text, style=null) {
    let action = {
      name: name,
      text: text,
      value: name,
      type: 'button'
    };
    if (style) {
      action.style = style;
    }
    TypeUtil.getOrSet(this.result, 'actions', []).push(action);
  }

  _filterLabels(labels) {
    return _.difference(labels, SYSTEM_LABELS);
  }

  _colorItem() {
    // Only one color is allowed per attachment, so the last one wins.
    // TODO(madadam): Use normal labels instead of opaque color coding?
    // TODO(madadam): Reserve green for status=done.
    //this._colorLabel(Defs.LABEL.INBOX, 'good');
    this._colorLabel('_favorite', '#439FE0');
    //this._colorLabel(Defs.LABEL.ALERT, 'warn');
  }

  _colorLabel(label, color) {
    let item = this._item;
    if (item.label && item.label.indexOf(label) != -1) {
      TypeUtil.maybeSet(this.result, 'color', color);
    }
  }

  /**
   * Format a userId for sending in a message.
   * @param minderUserId, Minder userId.
   * @param Promise(name) formatted name.
   */
  _formatUserId(minderUserId) {
    return this._databaseContext.getUserFromMinderUserId(minderUserId)
      .then(user => {
        // TODO(madadam): Store account info in UserStore, e.g. user.accounts.slack_com.userId, teamId etc.
        let slackUserId = _.get(user, 'accounts.slack_com.userId');
        if (slackUserId) {
          // Prefer Slack ID, formatted for Slack channel.
          return _.join(['<@', slackUserId,'>'], "");
        } else {
          // Fall back to plain text user name.
          return _.get(user, 'title');
        }
      });
  }

}
