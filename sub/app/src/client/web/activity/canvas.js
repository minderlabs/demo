//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import { CanvasContainer } from '../component/canvas';
import { TypeRegistry } from '../framework/type_registry';
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
      type: React.PropTypes.string.isRequired,
      canvas: React.PropTypes.string,
      itemId: React.PropTypes.string.isRequired
    })
  };

  render() {
    let { config } = this.context;
    let { params } = this.props;
    let { canvas, itemId } = params;

    let typeRegistry = this.context.injector.get(TypeRegistry);
    let canvasComponent = (
      <CanvasContainer typeRegistry={ typeRegistry } canvas={ canvas } itemId={ itemId }/>
    );

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
