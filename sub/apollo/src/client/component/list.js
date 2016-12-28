//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { filter } from 'graphql-anywhere';

import { QueryRegistry } from '../data/subscriptions';
import { TypeRegistry } from './type/registry';
import { ListItem } from './list_item';

import './list.less';

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  // TODO(burdon): Replace with ux list.

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

  /**
   * Must override to return item fragment.
   */
  getItemFragment() {}

  // TODO(burdon): Unregister.
  componentWillReceiveProps(nextProps) {
//  this.props.injector.get(QueryRegistry).register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

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
                <ListItem item={ filter(this.getItemFragment(), item) }
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
