//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { ID, Matcher, Mutator, MutationUtil, ItemReducer, TypeUtil } from 'minder-core';
import { TextBox } from 'minder-ux';

/**
 * Basic item fragment (common fields).
 */
export const ItemFragment = gql`
  fragment ItemFragment on Item {
#   __typename

    id
    type
    labels
    title
  }
`;

/**
 * Card component wrapper.
 * This component renders the common layout and common controls.
 * It also implement item lifecycle (e.g., saving modified fields).
 */
export class CardContainer extends React.Component {

  static propTypes = {

    /**
     * The component is initially rendered before the query executes.
     */
    item: React.PropTypes.object,

    /**
     * Provided by Mutator.graphql() below (but not when the component is first instantiated).
     */
    mutator: React.PropTypes.object,

    /**
     * Called before item is saved.
     * @return {[Mutation]} array of mutations (or null).
     */
    onSave: React.PropTypes.func
  };

  static childContextTypes = {

    /**
     * TODO(burdon): Provide onMutation callback instead and coordiate from here instead?
     * NOTE: Assumes all mutations are based from this HOC mutation type.
     */
    mutator: React.PropTypes.object
  };

  getChildContext() {
    return {
      mutator: this.props.mutator
    };
  }

  /**
   * Auto-save when item chages.
   */
  componentWillReceiveProps(nextProps) {
    let { item } = this.props;
    if (item && nextProps.item) {
      let oldId = item.id;
      if (oldId && oldId != nextProps.item.id) {
        this.maybeSave();
      }
    }
  }

  /**
   * Auto-save whe component is removed.
   */
  componentWillUnmount() {
    let { item } = this.props;
    if (item) {
      this.maybeSave();
    }
  }

  /**
   * Check for modified elements and submit mutation if necessary.
   */
  maybeSave() {
    let { item } = this.props;
    let mutations = [];

    // Generic values.
    TypeUtil.maybeAppend(mutations, MutationUtil.field('title', 'string', this.refs.title.value, item.title));

    // Get type-specific values.
    if (this.props.onSave) {
      TypeUtil.maybeAppend(mutations, this.props.onSave());
    }

    // TODO(burdon): Get mutator from context? Or from Redux?
    if (mutations.length) {
      this.props.mutator.updateItem(item, mutations);
    }
  }

  /**
   * Renders the outer card, with content from type-specific item.
   */
  render() {
    let { children, item } = this.props;
    if (!item) {
      return null;
    }

    return (
      <div className="app-detail ux-column">
        <div className="ux-section ux-row">
          <TextBox ref="title" className="ux-expand" value={ item.title }/>
        </div>

        <div className="ux-section ux-debug">
          { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
        </div>

        <div className="ux-scroll-container">
          <div className="ux-scroll-panel">
            { children }
          </div>
        </div>
      </div>
    );
  }
}


const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    // TODO(burdon): Bind needed objects instead (e.g., Matcher, TypeRegistry).
    // Provide for Mutator.graphql
    injector: minder.injector,

    // Matcher's context (same as server).
    context: {
      user: { id: minder.user.id }
    },

    user: minder.user
  }
};

/**
 * The wrapper provides the following properties:
 * {
 *   user     (from the Redux state)
 *   mutator  (from the Redux injector)
 * }
 *
 * @param reducer
 * @returns {React.Component} Item control.
 */
export function composeItem(reducer) {
  return compose(

    // Map Redux state to properties.
    connect(mapStateToProps),

    graphql(reducer.query, {

      // Map mproperties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let matcher = props.injector.get(Matcher);

        let { type, id:localItemId } = ID.fromGlobalId(props.itemId);

        return {
          variables: {
            itemId: props.itemId,
            localItemId: localItemId
          },

          reducer: (previousResult, action) => {
            return reducer.reduceItem(matcher, props.context, previousResult, action);
          }
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        return {
          item: reducer.getItem(data)
        };
      }
    }),

    // TODO(burdon): Provides props.mutator (too obscure)! Move here?
    Mutator.graphql(reducer.mutation)
  );
}
