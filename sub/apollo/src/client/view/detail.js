//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { goBack } from 'react-router-redux'
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ID, IdGenerator } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutation';

import TypeRegistry from './component/type_registry';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  // Pass down through component tree.
  // TODO(burdon): ItemMutator interface.
  static childContextTypes = {
    createItem: React.PropTypes.func,
    updateItem: React.PropTypes.func
  };

  static propTypes = {
    createItem: React.PropTypes.func.isRequired,
    updateItem: React.PropTypes.func.isRequired,

    onClose: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      item: React.PropTypes.object
    })
  };

  getChildContext() {
    return {
      createItem: this.props.createItem,
      updateItem: this.props.updateItem
    };
  }

  handleSave(item) {
    let mutation = [];

    // TODO(burdon): Generalize.
    if (this.props.data.item.title != this.refs.title.value) {
      mutation.push({
        field: 'title',
        value: {
          string: this.refs.title.value
        }
      });
    }

    if (mutation.length) {
      this.props.updateItem(item, mutation);
    }

    this.props.onClose(true);
  }

  handleCancel() {
    this.props.onClose(false);
  }

  render() {
    let { item } = this.props.data;

    // TODO(burdon): Can we ensure component is well-formed?
    if (!item) {
      return <div/>;
    }

    let detail = item && TypeRegistry.render(item, this.props.userId);

    return (
      <div className="app-column">
        <div className="app-section">
          <div className="app-row">
            <TextBox ref="title" className="app-expand" value={ item.title }/>
          </div>
        </div>

        <div className="app-section app-expand">
          { detail }
        </div>

        <div className="app-toolbar app-center">
          <button onClick={ this.handleSave.bind(this, item) }>Save</button>
          <button onClick={ this.handleCancel.bind(this) }>Cancel</button>
        </div>
      </div>
    );
  }
}

//
// Queries
//

// TODO(burdon): Dynamically change query fragments based on type? (why statically compiled AST?)

// TODO(burdon): Use directives to only include fragment of appropriate type.
// http://graphql.org/learn/queries/#inline-fragments
// ...Task @include(if: $type='Task')

// __typename
// http://graphql.org/learn/queries/#meta-fields

const DetailQuery = gql`
  query DetailQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      id
      type
      labels
      title
      
      __typename
      ${_.map(TypeRegistry.names, (name) => '...' + name).join('\n')}
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    idGenerator: minder.injector.get(IdGenerator),
    userId: minder.userId
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onClose: (save) => {
      dispatch(goBack());
    }
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  graphql(DetailQuery, {
    options: (props) => {
      return {
        fragments: TypeRegistry.fragments,

        variables: {
          itemId: props.params.itemId
        }
      };
    }
  }),

  graphql(UpdateItemMutation, {
    props: ({ ownProps, mutate }) => ({
      createItem: (type, mutations) => {
        let itemId = ownProps.idGenerator.createId();   // TODO(burdon): Factor out?
        return mutate({
          variables: {
            itemId: ID.toGlobalId(type, itemId),
            mutations: mutations
          }
        });
      },

      updateItem: (item, mutations) => mutate({
        variables: {
          itemId: ID.toGlobalId(item.type, item.id),    // TODO(burdon): ID? createItem?
          mutations: mutations
        }
      })
    })
  })

)(DetailView);
