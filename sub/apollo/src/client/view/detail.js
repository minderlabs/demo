//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, Mutator, MutationUtil, Reducer, TypeUtil } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutations';

import { TypeRegistry } from './component/type/registry';

import './detail.less';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  // TODO(burdon): When Nav from Group -> Task keeps Detail and title is the same.

  static DETAIL_REF = 'detail';

  static childContextTypes = {
    // NOTE: Assumes all mutations are based from this HOC mutation type.
    mutator: React.PropTypes.object
  };

  static contextTypes = {
    navigator: React.PropTypes.object,
  };

  static propTypes = {
    data: React.PropTypes.shape({
      item: React.PropTypes.object
    })
  };

  getChildContext() {
    return {
      // NOTE: Provided via Mutator.graphql()
      mutator: this.props.mutator
    };
  }

  componentWillReceiveProps(nextProps) {
    // Auto-save.
    let oldId = _.get(this.props, 'data.item.id');
    if (oldId && oldId != nextProps.data.item.id) {
      this.maybeSave();
    }
  }

  componentWillUnmount() {
    // Auto-save.
    this.maybeSave();
  }

  /**
   * Check for modified elements and submit mutation if necessary.
   */
  maybeSave() {
    let { item } = this.props.data;
    let mutations = [];

    // Item values.
    TypeUtil.maybeAppend(mutations, MutationUtil.field('title', 'string', this.refs.title.value, item.title));

    // Detail type values.
    TypeUtil.maybeAppend(mutations, this.refs[DetailView.DETAIL_REF].mutations);

    if (mutations.length) {
      this.props.mutator.updateItem(item, mutations);
    }
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
      <div className="app-detail ux-column">
        <div className="ux-section ux-row">
          <TextBox ref="title" className="ux-expand" value={ item.title }/>
        </div>

        <div className="ux-scroll-container">
          <div className="ux-scroll-panel">
            { detail }
          </div>
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

export default compose(
  connect(mapStateToProps),

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
