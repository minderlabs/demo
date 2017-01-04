//
// Copyright 2016 Minder Labs.
//

import React from 'react';

// TODO(burdon): Needed for icon.
import { TypeRegistry } from './type/registry';

//import './list.less';

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  // TODO(burdon): Grouping.
  // TODO(burdon): Custom renderer.
  // TODO(burdon): Custom list (e.g., for documents).
  // TODO(burdon): More...
  // TODO(burdon): Move subscriptions (QueryRegistry) to list_factory.

  static COUNT = 10;

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired,

    onItemSelect: React.PropTypes.func.isRequired,

    count: React.PropTypes.number,
    items: React.PropTypes.array
  };

  // NOTE: React.defaultProps is called after Redux.
  static defaults = (props) => {
    return _.defaults({}, props, {
      count: List.COUNT
    });
  };

  // TODO(burdon): Unregister.
  componentWillReceiveProps(nextProps) {
//  this.props.injector.get(QueryRegistry).register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  // TODO(burdon): Move
  handleLabelUpdate(item, label, add=true) {
    // TODO(burdon): Factor out.
    let mutations = [
      {
        field: 'labels',
        value: {
          array: {
            index: add ? 0 : -1,
            value: {
              string: label
            }
          }
        }
      }
    ];

    this.props.mutator.updateItem(item, mutations);
  }

  handleMore() {
    this.props.fetchMoreItems().then(() => {
      // Glue to bottom.
      let el = $(this.refs.items);
      el[0].scrollTop = el[0].scrollHeight;
    });
  }

  render() {
    let items = this.props.items || [];

    // Only show icon if type isn't constrained.
    let typeRegistry = this.props.injector.get(TypeRegistry);
    let icon = (item) => !this.props.filter.type && typeRegistry.icon(item.type);

    // Paging control.
    // TODO(burdon): Conditionally show more button based on page size and server hint.
    let more = items.length > List.COUNT && (
      <div className="ux-row ux-center">
        <i className="ux-icon ux-icon-action" onClick={ this.handleMore.bind(this) }>expand_more</i>
      </div>
    );

    // TODO(burdon): Track scroll position in redux so that it can be restored.

    return (
      <div className="ux-column ux-list">
        <div ref="items" className="ux-column ux-scroll-container">
          {items.map(item => {
            // TODO(burdon): Factor out search list.
            let containerClass = 'ux-list-item-container';
            let refs = null;

            // Grouped items.
            if (!_.isEmpty(item.refs)) {
              containerClass += ' ux-list-item-group';
              refs = (
                <div className="ux-list-item-refs">
                  {item.refs.map(ref => (
                    <ListItem key={ ref.id }
                              item={ ref }
                              icon={ icon(ref) }
                              onSelect={ this.handleItemSelect.bind(this, ref) }/>
                  ))}
                </div>
              );
            }

            // Master item.
            return (
              <div key={ item.id }className={ containerClass }>
                <ListItem item={ item }
                          favorite={ this.props.favorite !== false }
                          icon={ icon(item) }
                          onSelect={ this.handleItemSelect.bind(this, item) }
                          onLabelUpdate={ this.handleLabelUpdate.bind(this) }/>

                { refs }
              </div>
            );
          })}

          { more }
        </div>
      </div>
    );
  }
}

/**
 * List Item.
 */
class ListItem extends React.Component {

  // TODO(burdon): Create factory for different types (folder, search, cards, etc.)

  static propTypes = {
    // TODO(burdon): Constrain by fragment (graphql-anywhere): propType(VoteButtons.fragments.entry)
    // http://dev.apollodata.com/react/fragments.html
    item:           React.PropTypes.object.isRequired,

    onSelect:       React.PropTypes.func.isRequired,
    onLabelUpdate:  React.PropTypes.func
  };

  static contextTypes = {
    injector: React.PropTypes.object.isRequired
  };

  handleSelect() {
    this.props.onSelect(this.props.item);
  }

  handleToggleLabel(label) {
    let { item } = this.props;
    this.props.onLabelUpdate && this.props.onLabelUpdate(item, label, _.indexOf(item.labels, label) == -1);
  }

  render() {
    let { item, favorite, icon } = this.props;

    // TODO(burdon): Const for labels.
    // TODO(burdon): Custom renderer for different list type.
    let marginIcon = favorite && (
      <i className="ux-icon" onClick={ this.handleToggleLabel.bind(this, '_favorite') }>
        { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }
      </i>
    );

    // TODO(burdon): Custom list item (=> column).
    const typeRegistry = this.context.injector.get(TypeRegistry);
    let customListItem = typeRegistry.renderToListItem(item.type, item, this.handleSelect.bind(this));

    if (customListItem) {
      return customListItem;
    } else {
      // Render generic ListItem.
      return (
        <div className="ux-row ux-list-item">
          { marginIcon }

          <div className="ux-text ux-expand" onClick={ this.handleSelect.bind(this) }>
            { item.title }
          </div>

          <i className="ux-icon ux-icon-type">{ icon }</i>
          <i className="ux-icon ux-icon-delete"
             onClick={ this.handleToggleLabel.bind(this, '_deleted') }>cancel</i>
        </div>
      );
    }
  }
}
