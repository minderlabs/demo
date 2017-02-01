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
      canvas: React.PropTypes.string.isRequired,
      itemId: React.PropTypes.string.isRequired
    })
  };

  render() {
    let { config } = this.context;
    let { params } = this.props;
    let { canvas, itemId } = params;
    let { type } = ID.fromGlobalId(itemId);

    // TODO(burdon): Don't put injector in context. Instead inject required objects?
    let typeRegistry = this.context.injector.get(TypeRegistry);
    let canvasComponent = typeRegistry.canvas(type, itemId, canvas);

    // TODO(burdon): Layout based on form factor.
    // TODO(burdon): Expand button (in app state).
    let platform = _.get(config, 'app.platform');
    if (platform == 'mobile' || platform == 'crx') { //} || canvasComponent.props.expand) {
      return (
        <FullLayout>
          { canvasComponent }
        </FullLayout>
      )
    } else {
      // TODO(burdon): Get folder from state.
      let finder = <FinderView folder={ 'inbox' }/>;
      return (
        <SplitLayout nav={ finder }>
          { canvasComponent }
        </SplitLayout>
      )
    }
  }
}
