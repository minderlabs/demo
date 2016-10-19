//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

// TODO(burdon): Create lib for UX and Data.
import ItemList from '../../../common/components/web/item_list';

import CreateItemMutation from '../../../common/mutations/create_item';

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
      search: '',
      title: ''
    };
  }

  search() {
    // TODO(burdon): Update relay query?
    let query = this.state.search;
    console.log('SEARCH', query);
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

    // TODO(burdon): Remove reference by accessing event?
    this.refs.create_text.focus();
  }

  //
  // Handlers.
  //

  handleTextChange(event) {
//  console.log(event.target);
    switch (event.target) {
      case this.refs.search_text:
        // TODO(burdon): Trigger after timeout.
        this.setState({
          search: event.target.value
        });
        break;

      case this.refs.create_text:
        this.setState({
          title: event.target.value
        });
        break;
    }
  }

  handleKeyUp(event) {
//  console.log(event.target);
    switch (event.keyCode) {
      case 13: {
        switch (event.target) {
          case this.refs.search_text:
            this.search();
            break;

          case this.refs.create_text:
            this.createItem();
            break;
        }

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
    const SearchBar = (
      <div className="app-section app-toolbar">
        <input ref="search_text" type="text" autoFocus="autoFocus" className="app-expand"
               value={ this.state.search }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>
      </div>
    );

    // Cannot be stateless function since has ref.
    const EditBar = (
      <div className="app-section app-toolbar">
        <input ref="create_text" type="text" className="app-expand"
               value={ this.state.title }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>

        <button onClick={ this.handleCreateButton.bind(this) }>Create</button>
      </div>
    );

    return (
      <div className="app-panel-column">
        { SearchBar }

        <div className="app-section app-panel-column">
          <ItemList user={ user } onSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        { EditBar }
      </div>
    );
  }
}

export default Relay.createContainer(HomeView, {

  // TODO(burdon): How to pass $query to ItemList fragment?
  // http://stackoverflow.com/questions/34346273/search-functionality-using-relay
  // TODO(burdon): On change: https://facebook.github.io/relay/docs/api-reference-relay-container.html#preparevariables
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
