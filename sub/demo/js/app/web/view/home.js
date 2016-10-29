//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import {
  fromGlobalId
} from 'graphql-relay';

// TODO(burdon): Create lib for UX and Data.
import ItemList from '../../../common/components/web/item_list';
import TextBox from '../../../common/components/web/textbox';

import CreateItemMutation from '../../../common/mutations/create_item';

import Path from '../path';

import './home.less';

/**
 * Home view.
 */
class HomeView extends React.Component {

  // TODO(burdon): Cache in-memory state (e.g., search text).

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      search: '',
      title: ''
    };

    // TODO(burdon): Use TextBox.
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
    let { viewer } = this.props;

    // TODO(burdon): Dynamically customize EditBar by type (or go direct to detail).
    let type = $(this.refs.type_select).val();

    let title = this.state.title;
    if (title) {
      let data = {};
      switch (type) {
        case 'Task': { // TODO(burdon): Consts from database.
          let { id: userId } = fromGlobalId(viewer.user.id);

          _.merge(data, {
            priority: 1,
            owner: userId
          });
          break;
        }
      }

      let mutation = new CreateItemMutation({
        viewer: viewer,
        type: type,
        title: title,
        data: data
      });

      // TODO(burdon): Requery on update? Listen for events? Is this cached?
      this.props.relay.commitUpdate(mutation, {
        onSuccess: (result) => {
          console.log('Mutation ID: %s', result.createItemMutation.clientMutationId);
        }
      });

      this.setState({ title: '' });
    }

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
        }, () => {
          this.triggerSearch();
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
    let { viewer } = this.props;

    // TODO(burdon): Factor out.
    const SearchBar = (
      <div className="app-toolbar app-toolbar-search">
        <input ref="search_text"
               type="text"
               className="app-expand"
               autoFocus="autoFocus"
               value={ this.state.search }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>

        <i onClick={ this.triggerSearch.bind(this) } className="material-icons">search</i>
      </div>
    );

    // TODO(burdon): Factor out.
    const SearchList = (
      <div className="app-panel app-column app-expand">
        <ItemList ref="items"
                  viewer={ viewer }
                  onSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );

    // TODO(burdon): Factor out.
    const CreateBar = (
      <div className="app-toolbar app-toolbar-create">

        <select ref="type_select">
          <option value="Note">Note</option>
          <option value="Task">Task</option>
        </select>

        <input ref="create_text"
               type="text"
               className="app-expand"
               value={ this.state.title }
               onChange={ this.handleTextChange.bind(this) }
               onKeyUp={ this.handleKeyUp.bind(this) }/>

        <i onClick={ this.handleCreateButton.bind(this) } className="material-icons">add</i>
      </div>
    );

    return (
      <div className="app-column app-expand">
        { SearchBar }
        { SearchList }
        { CreateBar }
      </div>
    );
  }
}

export default Relay.createContainer(HomeView, {

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        user {
          id
        }

        ${ItemList.getFragment('viewer')}

        ${CreateItemMutation.getFragment('viewer')}
      }
    `
  }
});
