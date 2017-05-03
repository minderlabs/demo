//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Fragments } from 'minder-core';
import { List, ListItem, ReactUtil } from 'minder-ux';

import { Navbar } from '../component/navbar';
import { Activity } from './activity';
import { Layout } from './layout';

import './admin.less';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class AdminActivity extends React.Component {

  static childContextTypes = Activity.childContextTypes;

  getChildContext() {
    return Activity.getChildContext(this.props);
  }

  static ItemRenderer = (item) => (
    <ListItem item={ item }>
      <ListItem.Icon icon="person_outline"/>
      <div className="app-admin-email">{ _.get(item, 'title') }</div>
      <div className="app-admin-name">{ _.get(item, 'user.title') }</div>
      <div>{ _.get(item, 'user') && 'Active' }</div>
    </ListItem>
  );

  state = {
    // Active Group.
    groupId: null
  };

  handleSelectGroup(group) {
    this.setState({
      groupId: group && group.id
    })
  }

  render() {
    return ReactUtil.render(this, () => {
      let { items:groups } = this.props;
      let { groupId } = this.state;

      // Join email whitelist with actual members.
      let whitelist = null;
      if (groupId) {
        let group = _.find(groups, group => group.id === groupId);
        whitelist = _.map(group.whitelist, email => {
          let user = _.find(group.members, member => member.email === email);
          return {
            id: email,
            title: email,
            user
          };
        });
      }

      let navbar = (
        <Navbar search={ false }>
          <h2>Groups</h2>
        </Navbar>
      );

      return (
        <Layout navbar={ navbar } search={ false } className="app-admin-activity">

          <div className="ux-columns">

            {/* Master */}
            <div className="ux-column app-admin-groups">
              <List ref="groups"
                    items={ groups }
                    onItemSelect={ this.handleSelectGroup.bind(this) }/>
            </div>

            {/* Detail */}
            <div className="ux-column">
              <List ref="whitelist"
                    items={ whitelist }
                    itemRenderer={ AdminActivity.ItemRenderer }/>
            </div>
          </div>
        </Layout>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const AdminQuery = gql`
  query AdminQuery($groupFilter: FilterInput) { 
    search(filter: $groupFilter) {
      items {
        ...ItemFragment
        ...GroupFragment

        ... on Group {
          whitelist
        }
      }
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.GroupFragment}
`;

export default Activity.compose(

  graphql(AdminQuery, {
    options: (props) => ({
      variables: {
        groupFilter: {
          namespace: 'system',
          type: 'Group'
        }
      }
    }),

    props: ({ ownProps, data }) => {
      let { errors, loading, search } = data;
      let { items } = search;

      return {
        errors,
        loading,
        items
      };
    }
  })

)(AdminActivity);
