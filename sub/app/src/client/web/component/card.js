//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

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
    item: PropTypes.object.isRequired,
    className: PropTypes.string,
    icon: PropTypes.string
  };

  static contextTypes = {
    config: PropTypes.object.isRequired,
    navigator: PropTypes.object.isRequired
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

    let debugStr = config.debug &&
      TypeUtil.stringify(_.pick(item, ['type', 'id']), false) +
        (item.namespace ? ` [${item.namespace[0].toUpperCase()}]` : '') +
        (item.labels ? ` ${JSON.stringify(item.labels)}` : '');

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

        { debugStr &&
        <div className="ux-card-section">
          <div className="ux-section-body ux-debug" title={ JSON.stringify(_.pick(item, ['namespace', 'bucket'])) }>
            { debugStr }
          </div>
        </div>
        }
      </div>
    );
  }
}
