//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

// TODO(burdon): Create lib for UX and Data.
import ItemList from '../../../components/web/item_list';

import CreateItemMutation from '../../../mutations/create_item';

import Path from '../path';

/**
 * Home view.
 */
class HomeView extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      title: ''
    };
  }

  createItem() {
    let { user } = this.props;

    let title = this.state.title;
    if (title) {
      this.props.relay.commitUpdate(
        new CreateItemMutation({
          user: user,
          title: title
        })
      );

      this.setState({ title: '' });
    }

    this.refs.input.focus();
  }

  //
  // Handlers.
  //

  handleInputChange(event) {
    this.setState({
      title: event.target.value
    })
  }

  handleKeyUp(event) {
    switch (event.keyCode) {
      case 13: {
        this.createItem();
        break;
      }
    }
  }

  handleCreateButton(event) {
    this.createItem();
  }

  handleItemSelect(item) {
    this.context.router.push(Path.detail(item.id));
  }

  //
  // Layout.
  //

  render() {
    let { user } = this.props;

    // Cannot be stateless function since has ref.
    const EditBar = (
      <div className="app-section app-toolbar">
        <input ref="input" type="text" autoFocus="autoFocus" className="app-expand"
               value={ this.state.title }
               onChange={ this.handleInputChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>

        <button onClick={ this.handleCreateButton.bind(this) }>Create</button>
      </div>
    );

    return (
      <div className="app-panel-column">
        <div className="app-section app-panel-column">
          <ItemList user={ user } onSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        { EditBar }
      </div>
    );
  }
}

export default Relay.createContainer(HomeView, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
        title,

        ${ItemList.getFragment('user')},
        ${CreateItemMutation.getFragment('user')}
      }
    `
  }
});