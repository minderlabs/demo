//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { DomUtil, TypeUtil } from 'minder-core';

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
    let { config } = this.context;
    let { children, className, icon, item } = this.props;
    let { title, description } = item;

    className = DomUtil.className(
      'ux-card', 'ux-card-rounded', 'ux-card-type-' + item.type.toLowerCase(), className);

    return (
      <div className={ className }>
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

        { config.debug &&
        <div className="ux-section-body ux-debug" title={ JSON.stringify(_.pick(item, ['namespace', 'bucket'])) }>
          { TypeUtil.stringify(_.pick(item, ['type', 'id']), false) +
              (item.namespace ? ` (${item.namespace[0].toUpperCase()})` : '') +
              (item.labels ? ` ${JSON.stringify(item.labels)}` : '')}
        </div>
        }
      </div>
    );
  }
}
