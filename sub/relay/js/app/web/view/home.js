//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import SubscriptionManager from '../util/subscriptions';

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

  static contextTypes = {
    router: React.PropTypes.object,
    subscriptionManager: React.PropTypes.object
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  componentDidMount() {
    // TODO(burdon): Base class; Unsubscribe when unmount.
    this.context.subscriptionManager.subscribe(HomeView, this.props.relay);
  }

  createItem() {
    let { viewer } = this.props;
    let { type } = this.props.relay.variables;

    let title = this.refs.textTitle.value;
    if (title) {
      let data = {};

      switch (type) {
        case 'Task': { // TODO(burdon): Type consts from database.
          // TODO(burdon): Factor out setting default props.
          let { id: userId } = fromGlobalId(viewer.id);
          _.merge(data, {
            owner: userId
          });
          break;
        }
      }

      let mutation = new CreateItemMutation({
        viewer: viewer,
        type:   type,
        title:  title,
        data:   data
      });

      this.props.relay.commitUpdate(mutation, {
        // TODO(burdon): Nav to detail page?
        onSuccess: (result) => {
          this.refs.textTitle.value = '';
          this.refs.textTitle.focus();
        }
      });
    }
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
    this.props.relay.setVariables({
      text: text
    });
  }

  handleTypeChange(ev) {
    this.props.relay.setVariables({
      type: $(ev.target).val()
    });
  }

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;
    let { filter } = this.props.relay.variables;

    // TODO(burdon): Factor out.
    const SearchBar = (
      <div className="app-toolbar-search app-toolbar">

        <TextBox ref="textSearch"
                 autoFocus={ true }
                 placeholder="Search..."
                 onTextChange={ this.handleSearch.bind(this) }/>

        <i onClick={ () => this.handleSearch(this.refs.textSearch.value) } className="material-icons">search</i>
      </div>
    );

    // TODO(burdon): Factor out.
    const SearchList = (
      <div className="app-search-list app-panel app-column app-expand">
        <ItemList viewer={ viewer }
                  filter={ filter }
                  onSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );

    /*
    const Debug = (
      <div className="app-panel app-debug">
        <div className="app-section">{ JSON.stringify(filter, 0, 1)}</div>
      </div>
    );
    */

    // TODO(burdon): Factor out.
    // TODO(burdon): Add types to select (factor out Select).
    const CreateBar = (
      <div className="app-toolbar-create app-toolbar">

        <select value={ this.props.relay.variables.type } onChange={ this.handleTypeChange.bind(this) }>
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
      <div className="app-main-column app-column app-expand">
        { SearchBar }
        { SearchList }
        { CreateBar }
      </div>
    );
  }
}

function createFilter(folder, type, text) {
  let filter = {};

  if (text) {
    filter = { text };
  } else {
    filter = { type };

    // TODO(burdon): Get properties from folder object.
    switch (folder) {
      case 'favorites': {
        filter.labels = ['_favorite'];
        break;
      }
    }
  }

  return filter;
}

export default SubscriptionManager.manage(HomeView, Relay.createContainer(HomeView, {

  initialVariables: {

    // Router state.
    folder: undefined,

    // UX state.
    type: 'Task',
    text: '',

    // Filter passed to child fragment.
    filter: undefined
  },

  // Update variables from current state.
  // https://facebook.github.io/relay/docs/api-reference-relay-container.html#preparevariables
  prepareVariables: (variables) => {
    console.log('===>', JSON.stringify(variables));
    variables.filter = createFilter(variables.folder, variables.type, variables.text);
    console.log('<===', JSON.stringify(variables.filter));
    return variables;
  },

  // TODO(burdon): This doesn't work? Is the cache properly invalidated?
  // Force update when folder changes.
  // https://facebook.github.io/relay/docs/api-reference-relay-container.html#shouldcomponentupdate
  // shouldComponentUpdate: () => true,

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer @subscription {
        id

        ${ItemList.getFragment('viewer', { filter: variables.filter })}

        ${CreateItemMutation.getFragment('viewer')}
      }
    `
  }
}));
