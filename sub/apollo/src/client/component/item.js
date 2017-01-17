//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { ID, Matcher, Mutator, MutationUtil, TypeUtil } from 'minder-core';
import { Textarea, TextBox } from 'minder-ux';

import { TypeRegistry } from './type/registry';

import './item.less';

// TODO(burdon): Generalize to canvas.

/**
 * Basic item fragment (common fields).
 */
export const ItemFragment = gql`
  fragment ItemFragment on Item {
    id
    type
    labels
    title
    description
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

  state = {};

  getChildContext() {
    return {
      mutator: this.props.mutator
    };
  }

  /**
   * Auto-save when item chages.
   */
  componentWillReceiveProps(nextProps) {
    if (_.get(this.state, 'id') != _.get(nextProps, 'item.id')) {
      this.setState(_.pick(nextProps.item, ['id', 'title', 'description']));
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
    // TODO(burdon): Get mutator from context? Or from Redux?
    let { mutator, item } = this.props;

    let mutations = [];

    // Common properties.
    _.each(['title', 'description'], property => {
      let value = _.get(this.state, property);
      if (!_.isEqual(value, _.get(item, property))) {
        mutations.push(MutationUtil.createFieldMutation(property, 'string', value));
      }
    });

    // Get type-specific values.
    this.props.onSave && TypeUtil.maybeAppend(mutations, this.props.onSave());

    if (mutations.length) {
      mutator.updateItem(item, mutations);
    }
  }

  handlePropertyChange(property, value) {
    this.setState({
      [property]: value
    });
  }

  /**
   * Renders the outer card, with content from type-specific item.
   */
  render() {
    let { children, debug, item={}, typeRegistry, onToggleCanvas } = this.props;
    let { title, description } = this.state;

    let debugSection = debug && (
      <div className="ux-section ux-debug">
        { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
      </div>
    );

    return (
      <div className="ux-column">
        <div className="ux-section ux-row">
          <i className="ux-icon"
             onClick={ onToggleCanvas }>{ typeRegistry.icon(item) }</i>

          <TextBox className="ux-expand"
                   value={ title }
                   onChange={ this.handlePropertyChange.bind(this, 'title') }/>

          <div>
            <i className="ux-icon ux-icon-action ux-icon-save" onClick={ this.maybeSave.bind(this) }>save</i>
          </div>
        </div>

        <div className="ux-section ux-row">
          <Textarea className="ux-expand" rows="3"
                    value={ description }
                    onChange={ this.handlePropertyChange.bind(this, 'description') }/>
        </div>

        { debugSection }

        <div className="ux-scroll-container">
          <div className="ux-scroll-panel">
            { children }
          </div>
        </div>
      </div>
    );
  }
}

/**
 * NOTE: This is applied to the child container (e.g., TaskCardComponent).
 */
const mapStateToProps = (state, ownProps) => {
  let { injector, user } = state.minder;

  return {
    // TODO(burdon): Bind needed objects instead (e.g., Matcher, TypeRegistry).
    // Provide for Mutator.graphql
    injector,

    typeRegistry: injector.get(TypeRegistry),

    // Matcher's context (same as server).
    context: {
      user: { id: user.id }
    },

    user
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
