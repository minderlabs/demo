//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { goBack } from 'react-router-redux'
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, Mutator, MutationUtil, Reducer, TypeUtil } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutations';

import { TypeRegistry } from './component/type_registry';

import './detail.less';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  // TODO(burdon): When Nav from Group -> Task keeps Detail and title is the same.

  static DETAIL_REF = 'detail';

  // Pass down through component tree.
  static childContextTypes = {
    mutator: React.PropTypes.object,
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,

    onClose: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      item: React.PropTypes.object
    })
  };

  getChildContext() {
    return {
      mutator: this.props.mutator
    };
  }

  handleSave(item) {
    let mutations = [];

    // Item values.
    TypeUtil.maybeAppend(mutations,
      MutationUtil.field('title', 'string', this.refs.title.value, item.title));

    // Detail type values.
    TypeUtil.maybeAppend(mutations, this.refs[DetailView.DETAIL_REF].mutations);

    console.log('Mutations: %s', JSON.stringify(mutations));

    if (mutations.length) {
      this.props.mutator.updateItem(item, mutations);
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

    // Get detail component and add reference.
    let typeRegistry = this.props.injector.get(TypeRegistry);
    let detail =  React.cloneElement(typeRegistry.render(item, this.props.user), {
      ref: DetailView.DETAIL_REF
    });

    return (
      <div className="app-item-detail app-column">
        <div className="app-section app-row">
          <TextBox ref="title" className="app-expand" value={ item.title }/>
        </div>

        <div className="app-item-detail-content app-expand">
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
      __typename

      id
      type
      labels
      title
      
      ${_.map(TypeRegistry.singleton.names, (name) => '...' + name).join('\n')}
    }
  }
`;

// TODO(burdon): New Synax: http://dev.apollodata.com/react/fragments.html
// ${CommentsPage.fragments.comment} instead of createFragment/query.fragments option below.

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    // Provide for Mutator.graphql
    injector: minder.injector,
    context: {
      user: { id: minder.user.id }
    },
    user: minder.user
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
      let matcher = props.injector.get(Matcher);
      let typeRegistry = props.injector.get(TypeRegistry);

      return {
        fragments: typeRegistry.fragments,

        variables: {
          itemId: props.params.itemId
        },

        // TODO(burdon): Provide multiple sets (different fragments).
        reducer: Reducer.reduce(props.context, matcher, typeRegistry, UpdateItemMutation, DetailQuery)
      };
    }
  }),

  // Mutator.
  Mutator.graphql(UpdateItemMutation),

)(DetailView);
