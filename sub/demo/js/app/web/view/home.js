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

  // TODO(burdon): Cache in-memory state (e.g., search text) for back nav.

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);
  }

  createItem() {
    let { viewer } = this.props;

    // TODO(burdon): Dynamically customize EditBar by type (or go direct to detail).
    let type = $(this.refs.selectType).val();

    let title = this.refs.textTitle.value;
    if (title) {
      let data = {};
      switch (type) {
        case 'Task': { // TODO(burdon): Consts from database.
          // TODO(burdon): Factor out setting default props.
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
          this.refs.textTitle.value = '';
        }
      });
    }

    this.refs.textTitle.focus();
  }

  //
  // Handlers.
  //

  handleTitleKeyDown(event) {
    switch (event.keyCode) {
      case 13: { // Enter.
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

  handleSearch(text) {
    // Change state of sub-components.
    this.props.relay.setVariables({
      filter: {
        text: text
      }
    });
  }

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;

    // TODO(burdon): Factor out.
    const SearchBar = (
      <div className="app-toolbar app-toolbar-search">

        <TextBox ref="textSearch"
                 autoFocus={ true }
                 placeholder="Search..."
                 onTextChange={ this.handleSearch.bind(this) }/>

        <i onClick={ () => this.handleSearch(this.refs.textSearch.value) } className="material-icons">search</i>
      </div>
    );

    // TODO(burdon): Factor out.
    const SearchList = (
      <div className="app-panel app-column app-expand">
        <ItemList ref="items"
                  viewer={ viewer }
                  filter={ this.props.relay.variables.filter }
                  onSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );

    // TODO(burdon): Factor out.
    // TODO(burdon): Add types to select (factor out control).
    const CreateBar = (
      <div className="app-toolbar app-toolbar-create">

        <select ref="selectType">
          <option value="Task">Task</option>
          <option value="Note">Note</option>
        </select>

        <TextBox ref="textTitle"
                 placeholder="Title..."
                 onKeyDown={ this.handleTitleKeyDown.bind(this) }/>

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

  initialVariables: {
    filter: {
      text: ''
    }
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        user {
          id
        }

        ${ItemList.getFragment('viewer', { filter: variables.filter })}

        ${CreateItemMutation.getFragment('viewer')}
      }
    `
  }
});
