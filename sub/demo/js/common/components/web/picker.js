//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import TextBox from './textbox';

import './picker.less';

/**
 * Compact view of an Item.
 */
class Picker extends React.Component {

  // TODO(burdon): Allow text input while paging.

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    type: React.PropTypes.string.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      showPopup: false
    }
  }

  handleListKeyDown(event) {
    switch (event.keyCode) {

      // ESCAPE
      case 27: {
        event.stopPropagation(); // Don't reset input.
        this.refs.textbox.focus();
        break;
      }

      // UP
      case 38: {
        event.preventDefault(); // Don't scroll.
        let prev = $(event.target).prev();
        if (prev[0]) {
          prev.focus();
        } else {
          this.refs.textbox.focus();
        }
        break;
      }

      // DOWN
      case 40: {
        event.preventDefault(); // Don't scroll.
        let next = $(event.target).next();
        next.focus();
        break;
      }
    }
  }

  handleTextKeyDown(event) {
    switch (event.keyCode) {

      // DOWN
      case 40: {
        // Focus first item.
        $(this.refs.items).find('input:first').focus();
        break;
      }
    }
  }

  handleTextChange(text) {
    console.log('TEXT', text);
  }

  handleFocusChange(state) {
    // Give time for select event to propagate.
    setTimeout(() => {
      this.setState({
        showPopup: state || true
      });
    }, 100);  // TODO(burdon): Cannot be zero.
  }

  handleItemSelect(itemId) {
    this.props.onSelect && this.props.onSelect(itemId);
  }

  render() {
    let { viewer } = this.props;

    // TODO(burdon): Props.
    let placeholder = `Search ${this.props.type} ...`;

    let rows = viewer.items.edges.map((item) => {
      return (
        <input key={ item.node.id }
               readOnly="readOnly"
               defaultValue={ item.node.title }
               onKeyDown={ this.handleListKeyDown.bind(this) }
               onClick={ this.handleItemSelect.bind(this, item.node.id) }/>
      );
    });

    return (
      <div className="app-picker">
        <div>
          <TextBox ref="textbox"
                   value={ this.props.value }
                   placeholder={ placeholder }
                   onKeyDown={ this.handleTextKeyDown.bind(this) }
                   onTextChange={ this.handleTextChange.bind(this) }
                   onFocusChange={ this.handleFocusChange.bind(this) }/>
        </div>

        <div ref="items" className="app-picker-popup" style={ {'display': this.state.showPopup ? 'block' : 'none' } }>
          <div>
            { rows }
          </div>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(Picker, {

  // TODO(burdon): ???
  initialVariables: {
    type: 'Task'
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        items(first: 10, type: $type) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `
  }
});
