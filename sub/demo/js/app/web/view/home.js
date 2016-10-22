//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

// TODO(burdon): Create lib for UX and Data.
import ItemList from '../../../common/components/web/item_list';

import CreateTaskMutation from '../../../common/mutations/create_task';

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

    // TODO(burdon): Factor out searchbar.
    this._searchInterval = 200;
    this._searchTimeout = null;
  }

  doSearch() {
    this.refs.items.refs.component.setQuery(this.state.search);
  }

  triggerSearch() {
    this._searchTimeout && clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this.doSearch();
    }, this._searchInterval);
  }

  createItem() {
    let { user } = this.props;

    let title = this.state.title;
    if (title) {
      this.props.relay.commitUpdate(
        new CreateTaskMutation({
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
        this.setState({
          search: event.target.value
        });

        this.triggerSearch();
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
      case 13: { // Enter.
        switch (event.target) {
          case this.refs.search_text:
            this.doSearch();
            break;

          case this.refs.create_text:
            this.createItem();
            break;
        }

        break;
      }

      case 27: { // ESC.
        switch (event.target) {
          case this.refs.search_text:
            this.setState({
              search: ''
            }, () => {
              this.doSearch();
            });
            break;

          case this.refs.create_text:
            this.setState({
              title: ''
            });
            break;
        }
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

    // TODO(burdon): Factor out.
    const SearchBar = (
      <div className="app-section app-toolbar app-toolbar-search">
        <input ref="search_text" type="text" autoFocus="autoFocus" className="app-expand"
               value={ this.state.search }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>
      </div>
    );

    // TODO(burdon): Factor out.
    const CreateBar = (
      <div className="app-section app-toolbar app-toolbar-create">
        <input ref="create_text" type="text" className="app-expand"
               value={ this.state.title }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>

        <button onClick={ this.handleCreateButton.bind(this) }><i className="material-icons">add_circle</i></button>
      </div>
    );

    return (
      <div className="app-panel-column">
        { SearchBar }

        <div className="app-section app-panel-column">
          <ItemList ref="items" user={ user } onSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        { CreateBar }
      </div>
    );
  }
}

export default Relay.createContainer(HomeView, {

  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id
        title

        ${ItemList.getFragment('user')}
        ${CreateTaskMutation.getFragment('user')}
      }
    `
  }
});
