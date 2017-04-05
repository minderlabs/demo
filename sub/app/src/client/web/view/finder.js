//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { IdGenerator, QueryParser, SubscriptionWrapper } from 'minder-core';
import { Fragments, ListReducer } from 'minder-core';
import { ReactUtil } from 'minder-ux';

import { Const } from '../../../common/defs';
import { AppAction, ContextAction } from '../../common/reducers';
import { ContextManager } from '../../common/context';

import { BasicSearchList, CardSearchList, BasicListItemRenderer } from '../framework/lists';
import { connectReducer } from '../framework/connector';
import { Card } from '../component/card';

import './finder.less';

/**
 * Finder.
 */
class Finder extends React.Component {

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    this.context.mutator.batch(item.bucket).updateItem(item, mutations).commit();
  }

  render() {
    return ReactUtil.render(this, () => {
      let { typeRegistry } = this.context;
      let { contextManager, filter, listType } = this.props;

      let debug = false && (
        <div className="ux-debug ux-font-xsmall">{ JSON.stringify(filter) }</div>
      );

      // Inject items into list (via reducer) if the context manager is present.
      let itemInjector;
      if (contextManager) {
        itemInjector = (items) => contextManager.injectItems(items);
      }

      // TODO(burdon): FIX!
      listType = 'card';

      let list;
      switch (listType) {
        case 'card':
          list = <CardSearchList filter={ _.defaults(filter, { groupBy: true }) }
                                 itemInjector={ itemInjector }
                                 highlight={ false }
                                 className="ux-card-list"
                                 itemRenderer={ Card.ItemRenderer(typeRegistry) }
                                 onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
          break;

        case 'list':
        default:
          list = <BasicSearchList filter={ filter }
                                  itemRenderer={ BasicListItemRenderer(typeRegistry) }
                                  onItemSelect={ this.handleItemSelect.bind(this) }
                                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
      }

      return (
        <div className="app-finder ux-column">
          { list }
          { debug }
        </div>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const FoldersQuery = gql`
  query FoldersQuery {
    viewer {
      folders {
        type
        id
        alias
        filter
      }
    }
  }
`;

// TODO(burdon): Add Projects query.
const ContextQuery = gql`
  query ContextQuery($filter: FilterInput!) {
    contextItems: search(filter: $filter) {
      ...ItemFragment
      ...ContactTasksFragment
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.ContactTasksFragment}
`;

const mapStateToProps = (state, ownProps) => {
  let { injector, config, search } = AppAction.getState(state);

  // Required by Mutator.
  let idGenerator = injector.get(IdGenerator);

  // TODO(burdon): Move to layout config.
  let platform = _.get(config, 'app.platform');
  let listType = (platform === Const.PLATFORM.CRX) ? 'card' : 'list';

  // Construct filter (from sidebar context or searchbar).
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);

  // CRX app context.
  let contextManager = null;
  // TODO(burdon): Not just CRX.
  if (platform === Const.PLATFORM.CRX) {
    // Current user context (e.g., host inspector transient items).
    // TODO(burdon): Binds to context action; should trigger context to requery.
    let contextState = ContextAction.getState(state);
    contextManager = injector.get(ContextManager).updateContext(contextState);
  }

  return {
    contextManager,
    idGenerator,
    listType,
    filter,
    search,
  };
};

// TODO(burdon): Common reducer for queries (not bound to list).
let contextReducer = new ListReducer(ContextQuery);

export default compose(

  // Redux.
  connect(mapStateToProps),

  // Query.
  graphql(FoldersQuery, {

    props: ({ ownProps, data }) => {
      let { loading, error, viewer } = data;
      let { filter } = ownProps;

      // Create list filter (if not overridden by text search above).
      if (viewer && QueryParser.isEmpty(filter)) {
        _.each(viewer.folders, folder => {
          if (folder.alias === ownProps.folder) {
            filter = JSON.parse(folder.filter);
            return false;
          }
        });
      }

      return {
        loading,
        error,
        filter
      };
    }
  }),

  // Query.
  connectReducer(graphql(ContextQuery, {

    options: (props) => {
      let { contextManager } = props;

      // Lookup items from context.
      let filter = {};
      if (contextManager) {
        filter = contextManager.getFilter() || {};
      }

      return {
        variables: {
          filter
        },

        reducer: (previousResult, action) => {
          // NOTE: passing a null matcher. ContextQuery results don't match a simple filter.
          const nullMatcher = null;
          return contextReducer.reduceItems(nullMatcher, props.context, null, previousResult, action);
        }
      };
    },

    props: ({ ownProps, data }) => {
      let { contextItems } = data;
      let { contextManager } = ownProps;

      // Update context.
      if (contextManager) {
        contextManager.updateCache(contextItems);
      }

      return {
        contextItems,

        // For subscriptions.
        refetch: () => {
          data.refetch();
        }
      };
    }
  }))

)(SubscriptionWrapper(Finder));
