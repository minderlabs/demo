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
    let Card = typeRegistry.card(item.type);
    return <Card item={ item }/>;
  };

  static propTypes = {
    item: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
    icon: React.PropTypes.string
  };

  static contextTypes = {
    config: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired
  };

  handleSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  render() {
    let { children, className, icon, item } = this.props;
    let { title, description } = item;

    return (
      <div className={ DomUtil.className('ux-card', 'ux-card-rounded', 'ux-card-type-' + item.type.toLowerCase(), className) }>
        <div className="ux-card-header">
          <h1 className="ux-text-noselect ux-selector"
              onClick={ this.handleSelect.bind(this, item) }>{ title }</h1>

          { icon && <i className="ux-icon">{ icon }</i> }
        </div>

        { description &&
        <div className="ux-card-section">
          <div className="ux-font-xsmall">{ description }</div>
        </div>
        }

        { children }

        { true &&
        <div className="ux-section ux-debug">
          <div className="ux-section-body">
            { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
          </div>
        </div>
        }
      </div>
    );
  }
}
