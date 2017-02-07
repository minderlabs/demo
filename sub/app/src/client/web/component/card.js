//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { DomUtil } from 'minder-core';

import './card.less';

/**
 * Card wrapper.
 */
export class Card extends React.Component {

  /**
   * Render items as cards.
   * @param typeRegistry
   * @constructor
   */
  static ItemRenderer = (typeRegistry) => (item) => {
    return typeRegistry.card(item)
  };

  static propTypes = {
    className: React.PropTypes.string,
    icon: React.PropTypes.string,
    item: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  handleSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  render() {
    let { children, icon, item } = this.props;
    let className = DomUtil.className('ux-card', 'ux-card-type-' + item.type.toLowerCase(), this.props.className);

    // TODO(burdon): Set icon via context's typeRegistry.
    return (
      <div className={ className }>
        <div className="ux-card-header">
          <h1 className="ux-text-noselect ux-selector"
              onClick={ this.handleSelect.bind(this, item) }>{ item.title }</h1>

          { icon && <i className="ux-icon">{ icon }</i> }
        </div>
        <div className="ux-card-body">
          { children }
        </div>
      </div>
    );
  }
}
