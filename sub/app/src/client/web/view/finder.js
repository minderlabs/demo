//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { IdGenerator, QueryParser } from 'minder-core';
import { ReactUtil } from 'minder-ux';

import { Const } from '../../../common/defs';
import { AppAction, ContextAction } from '../../common/reducers';

import { BasicSearchList, CardSearchList, BasicListItemRenderer } from '../framework/lists';
import { Card } from '../component/card';

import './finder.less';

/**
 * Finder.
 */
class Finder extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    typeRegistry: React.PropTypes.object.isRequired
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    this.props.mutator.updateItem(item, mutations);
  }

  render() {
    return ReactUtil.render(this, () => {
      let { typeRegistry } = this.context;
      let { filter, listType } = this.props;

      let list;
      switch (listType) {
        case 'card':
          list = <CardSearchList filter={ filter }
                                 highlight={ false }
                                 className="ux-card-list"
                                 itemRenderer={ Card.ItemRenderer(typeRegistry) }
                                 onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
          break;

        case 'list':
        default:
          list = <BasicSearchList filter={ filter }
                                  groupBy={ false }
                                  itemRenderer={ BasicListItemRenderer(typeRegistry) }
                                  onItemSelect={ this.handleItemSelect.bind(this) }
                                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>;
      }

      return (
        <div className="app-finder ux-column">
          { list }
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
        id
        alias
        filter
      }
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { config, injector, search } = AppAction.getState(state);
  let { context } = ContextAction.getState(state);

  // TODO(burdon): Move to layout config.
  let listType = _.get(config, 'app.platform') == Const.PLATFORM.CRX ? 'card' : 'list';

  // Required by Mutator.
  let idGenerator = injector.get(IdGenerator);

  // Construct filter (from sidebar context or searchbar).
  let queryParser = injector.get(QueryParser);
  let filter = queryParser.parse(search.text);
  if (context && context.filter && !search.text) {
    filter = context.filter
  }

  return {
    idGenerator,
    listType,
    filter,
    search
  }
};

export default compose(

  // Redux.
  connect(mapStateToProps),

  // Query.
  graphql(FoldersQuery, {

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    // http://dev.apollodata.com/react/queries.html#default-result-props
    props: ({ ownProps, data }) => {
      let { loading, error, viewer } = data;
      let { filter } = ownProps;

      // Create list filter (if not overridden by text search above).
      if (viewer && QueryParser.isEmpty(filter)) {
        _.each(viewer.folders, folder => {
          if (folder.alias == ownProps.folder) {
            filter = JSON.parse(folder.filter);
            return false;
          }
        });
      }

      return {
        loading,
        error,
        filter
      }
    }
  }),

)(Finder);
