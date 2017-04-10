//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Fragments } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { Navbar } from '../component/navbar';
import { Card } from '../component/card';

import { Activity } from './activity';
import { Layout } from './layout';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class TestingActivity extends React.Component {

  static childContextTypes = Activity.childContextTypes;

  getChildContext() {
    return Activity.getChildContext(this.props);
  }

  state = {
    listType: 'card'
  };

  onAddItem() {
    this.refs.list.addItem();
  }

  onChangeView(listType) {
    this.setState({
      listType
    })
  }

  onItemUpdate(item) {
    console.log('Save: %s', JSON.stringify(item));
  }

  render() {
    return ReactUtil.render(this, () => {
      let { viewer, typeRegistry, items } = this.props;
      let { listType } = this.state;

      // TODO(burdon): Viewer null initially (Activity query not yet satisfied -- need to declare below?)
      if (!viewer) {
        console.warn('Viewer not loaded.');
      }

      let itemRenderer = null;
      switch (listType) {
        case 'card': {
          itemRenderer = Card.ItemRenderer(typeRegistry);
          break;
        }
      }

      let navbar = (
        <Navbar search={ false }>
          <div className="ux-toolbar">
            <div>
              <i className="ux-icon ux-icon-action"
                 onClick={ this.onAddItem.bind(this, 'list') }>add</i>
              <i className="ux-icon ux-icon-action"
                 onClick={ this.onChangeView.bind(this, 'list') }>view_list</i>
              <i className="ux-icon ux-icon-action"
                 onClick={ this.onChangeView.bind(this, 'card') }>view_module</i>
            </div>
          </div>
        </Navbar>
      );

      return (
        <Layout viewer={ viewer } navbar={ navbar }>
          <List ref="list"
                highlight={ false }
                items={ items }
                itemRenderer={ itemRenderer }
                onItemUpdate={ this.onItemUpdate.bind(this) }/>
        </Layout>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const TestQuery = gql`
  query TestQuery($filter: FilterInput) {
    search(filter: $filter) {
      items {
        ...ItemFragment
        ...ContactFragment
        ...TaskFragment

        ... on Task {
          tasks {
            ...TaskFragment
          }
        }
      }
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.ContactFragment}
  ${Fragments.TaskFragment}
`;

//
// Tasks are merged (i.e., status + assigee); sub Tasks of Project are isolated with separate/munged "project/task" IDs.
//
const TestMergedItemsQuery = gql`
  query TestQuery {
    search: search(filter: { type: "Task", expr: { field: "status", value: { int: 1 } } }) {
      items {
        id
        type
        title

        ... on Task {
          status
        }
      }
    }

    searchX: search(filter: { type: "Task" }) {
      items {
        id
        type
        title

        ... on Task {
          assignee {
            title
          }
        }
      }
    }
    
    searchY: search(filter: { type: "Project" }) {
      items {
        id
        type
        title

        ... on Project {
          tasks {
            title
          }
        }
      }
    }
  }  
`;

export default Activity.compose(

  graphql(TestMergedItemsQuery, {
    options: (props) => ({
      variables: {
        filter: { type: 'Task' }
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

)(TestingActivity);
