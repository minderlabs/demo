//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ItemFragment, GroupFragment } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { AppAction } from '../reducers';
import { TypeRegistry } from '../framework/type_registry';
import { FullLayout } from '../layout/full';

import './admin.less';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class AdminActivity extends React.Component {

  static ItemRenderer = (item) => (
    <ListItem item={ item }>
      <ListItem.Icon icon="person_outline"/>
      <ListItem.Title/>
      <div className="ux-expand">{ _.get(item, 'user.title') }</div>
      <div className="ux-expand">{ _.get(item, 'user') && 'Active' }</div>
    </ListItem>
  );

  state = {
    groupId: null
  };

  handleSelectGroup(group) {
    this.setState({
      groupId: group && group.id
    })
  }

  render() {
    let { items:groups } = this.props;
    let { groupId } = this.state;

    // TODO(burdon): Remove from list.
    // TODO(burdon): Add to list.
    // TODO(burdon): Join whitelist with actual members.

    let whitelist = null;
    if (groupId) {
      let group = _.find(groups, group => group.id == groupId);
      whitelist = _.map(group.whitelist, email => {
        let user = _.find(group.members, member => member.email == email);
        return {
          id: email,
          title: email,
          user
        };
      });
    }

    return (
      <FullLayout search={ false }>
        <div className="ux-column app-admin">
          <h1>Groups</h1>
          <div className="ux-columns">
            {/* Master */}
            <div className="ux-column app-admin-groups">
              <List ref="groups"
                    items={ groups }
                    onItemSelect={ this.handleSelectGroup.bind(this) }/>
            </div>

            {/* Detail */}
            <div className="ux-column app-admin-whitelist">
              <List ref="whitelist"
                    items={ whitelist }
                    itemRenderer={ AdminActivity.ItemRenderer }/>
            </div>
          </div>
        </div>
      </FullLayout>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const AdminQuery = gql`
  query AdminQuery($groupFilter: FilterInput) { 
    items(filter: $groupFilter) {
      ...ItemFragment
      ...GroupFragment
      
      ... on Group {
        whitelist
      }
    }
  }

  ${ItemFragment}
  ${GroupFragment}
`;

const mapStateToProps = (state, ownProps) => {
  let { injector } = AppAction.getState(state);

  return {
    typeRegistry: injector.get(TypeRegistry)
  };
};

export default compose(
  connect(mapStateToProps),

  graphql(AdminQuery, {
    options: (props) => ({
      variables: {
        groupFilter: {
          // TODO(burdon): Const.
          namespace: 'system',
          type: 'Group'
        }
      }
    }),

    props: ({ ownProps, data }) => {
      let { loading, error, items } = data;

      return {
        loading,
        error,
        items
      };
    }
  })

)(AdminActivity);
