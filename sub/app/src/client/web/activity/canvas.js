//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ID } from 'minder-core';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';

import { TypeRegistry } from '../component/type/registry';
import FinderView from '../view/finder';

/**
 * Canvas Activity.
 */
export default class CanvasActivity extends React.Component {

  static contextTypes = {
    config: React.PropTypes.object.isRequired,
    injector: React.PropTypes.object.isRequired
  };

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      type: React.PropTypes.string,
      itemId: React.PropTypes.string
    })
  };

  render() {
    let { config } = this.context;
    let { params } = this.props;
    let { canvas, itemId } = params;
    let { type } = ID.fromGlobalId(itemId);

    // TODO(burdon): Don't put injector in context. Instead inject required objects?
    // TODO(burdon): TypeRegistry canvas(type) should return appropriate object.
    let typeRegistry = this.context.injector.get(TypeRegistry);

    // TODO(burdon): Rename canvas.
    let content = typeRegistry.canvas(type, itemId, canvas);

    // TODO(burdon): Layout based on form factor.
    // TODO(burdon): If canvas is board then use MainLayout. Ask canvas which layout it prefers?
    let platform = _.get(config, 'app.platform');
    if (platform == 'mobile' || platform == 'crx' || content.props.expand) {
      return (
        <FullLayout>
          { content }
        </FullLayout>
      )
    } else {
      // TODO(burdon): Get folder from state.
      let finder = <FinderView folder={ 'inbox' }/>;
      return (
        <SplitLayout nav={ finder }>
          { content }
        </SplitLayout>
      )
    }
  }
}
