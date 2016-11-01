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

    this.props.relay.setVariables({
      folder: this.props.params.folder
    })
  }

  createItem() {
    let { viewer } = this.props;

    let title = this.refs.textTitle.value;
    if (title) {
      let data = {};

      let type = $(this.refs.selectType).val();
      switch (type) {
        case 'Task': { // TODO(burdon): Type consts from database.
          // TODO(burdon): Factor out setting default props.
          let { id: userId } = fromGlobalId(viewer.user.id);

          _.merge(data, {
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

      this.props.relay.commitUpdate(mutation, {
        onSuccess: (result) => {
          console.log('Mutation ID: %s', result.createItemMutation.clientMutationId);

          // TODO(burdon): Nav to detail page.
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
      filter: text ? {text: text} : {type: this.refs.selectType.value}
    });
  }

  handleTypeChange(ev) {
    let type = $(ev.target).val();
    this.props.relay.setVariables({
      filter: {
        type: type
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
        <ItemList ref="items"
                  viewer={ viewer }
                  filter={ this.props.relay.variables.filter }
                  onSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );

    // TODO(burdon): Factor out.
    // TODO(burdon): Add types to select (factor out Select).
    const CreateBar = (
      <div className="app-toolbar-create app-toolbar">

        <select ref="selectType" onChange={ this.handleTypeChange.bind(this) }>
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

export default Relay.createContainer(HomeView, {

  initialVariables: {
    folder: null,
    filter: {
      type: 'Task',
      labels: []
    }
  },

  // https://facebook.github.io/relay/docs/api-reference-relay-container.html#preparevariables
  prepareVariables: (variables) => {
    console.log('<<<', JSON.stringify(variables.filter));

    switch (variables.folder) {
      case 'favorites': {
        variables.filter.labels = ['_favorite']; // TODO(burdon): Const in database.
        break;
      }

      default: {
        variables.filter.labels = undefined;
      }
    }

    // TODO(burdon): Enable null.
    if (variables.filter.text) {
      variables.filter.type = undefined;
      variables.filter.labels = undefined;
    }

    console.log('>>>', JSON.stringify(variables.filter));

    return variables
  },

  // Force update when folder changes.
  // https://facebook.github.io/relay/docs/api-reference-relay-container.html#shouldcomponentupdate
  shouldComponentUpdate: () => true,

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
