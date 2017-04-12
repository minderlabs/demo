//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'react-apollo';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ID, SubscriptionWrapper, TypeUtil } from 'minder-core';
import { List, ListItem, ReactUtil } from 'minder-ux';

import { Path } from '../../common/path';

import './sidepanel.less';

/**
 * Sidebar content.
 */
class SidePanel extends React.Component {

  static ItemRenderer = (typeRegistry) => (item) => {
    let { icon } = item;

    return (
      <ListItem item={ item }>
        <ListItem.Icon icon={ icon || typeRegistry.icon(item.type) }/>
        <ListItem.Text value={ item.title }/>
      </ListItem>
    );
  };

  static propTypes = {
    typeRegistry: PropTypes.object.isRequired
  };

  static contextTypes = {
    navigator: PropTypes.object.isRequired
  };

  onSelect(item) {
    let { alias, link } = item;
    this.context.navigator.push(link || (alias && Path.folder(alias)) || Path.canvas(ID.getGlobalId(item)));
  }

  render() {
    return ReactUtil.render(this, () => {
      let { typeRegistry, viewer } = this.props;

      const adminItems = [
        // TODO(burdon): Admin ACL.
        {
          type: 'Folder',
          id: 'folder-admin',
          title: 'Admin',
          icon: 'build',
          link: Path.ADMIN
        },
        // TODO(burdon): If debug set in config.
        {
          type: 'Folder',
          id: 'folder-testing',
          title: 'Testing',
          icon: 'bug_report',
          link: Path.TESTING
        }
      ];

      const FolderList = (props) => (
        <List items={ props.items }
              itemRenderer={ SidePanel.ItemRenderer(typeRegistry) }
              onItemSelect={ this.onSelect.bind(this) }/>
      );

      let folders = viewer.folders;
      let groups = viewer.groups;
      let projects = TypeUtil.flattenArrays(_.map(groups, group => group.projects));

      return (
        <div className="app-sidepanel">
          <FolderList items={ folders }/>
          <div className="app-divider"/>
          <FolderList items={ groups }/>
          <div className="app-divider"/>
          <FolderList items={ projects }/>
          <div className="app-divider"/>
          <FolderList items={ adminItems }/>
        </div>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const SidebarQuery = gql`
  query SidebarQuery {

    viewer {
      user {
        type
        id
        title
      }

      folders {
        type
        id
        alias
        icon
        title
      }

      groups {
        type
        id
        title

        projects {
          type
          id
          type
          labels
          title
        }
      }
    }
  }
`;

export default compose(

  // Query.
  graphql(SidebarQuery, {
    props: ({ ownProps, data }) => {
      let { errors, loading, viewer } = data;

      return {
        errors,
        loading,
        viewer,

        // For subscriptions.
        refetch: () => {
          data.refetch();
        }
      };
    }
  }),

)(SubscriptionWrapper(SidePanel));
