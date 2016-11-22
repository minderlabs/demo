//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { goBack } from 'react-router-redux'
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { TextBox } from 'minder-ux';

import { ACTION } from '../reducers';

import TypeRegistry from '../component/typeRegistry';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    onClose: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      item: React.PropTypes.object
    })
  };

  handleSave() {
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

    let detail = item && TypeRegistry.render(item);

    return (
      <div className="app-column">
        <div className="app-section">
          <div className="app-row">
            <TextBox className="app-expand" value={ item.title }/>
          </div>
        </div>

        <div className="app-section app-expand">
          { detail }
        </div>

        <div className="app-toolbar app-center">
          <button onClick={ this.handleSave.bind(this) }>Save</button>
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
  return {
    userId: state.minder.userId
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
          userId: props.userId,
          itemId: props.params.itemId
        }
      };
    }
  })

)(DetailView);
