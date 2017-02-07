//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import { CanvasContainer } from '../component/canvas';
import { TypeRegistry } from '../framework/type_registry';

import FolderView from '../view/folder';

/**
 * Canvas Activity.
 */
class CanvasActivity extends React.Component {

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

  static contextTypes = {
    config: React.PropTypes.object.isRequired,
    injector: React.PropTypes.object.isRequired
  };

  render() {
    let { config, injector } = this.context;
    let { params } = this.props;
    let { type, canvas, itemId } = params;

    let canvasComponent = (
      <CanvasContainer typeRegistry={ injector.get(TypeRegistry) } type={ type } canvas={ canvas } itemId={ itemId }/>
    );

    // TODO(burdon): Layout based on form factor. Replace "expand" prop below with app state.
    let platform = _.get(config, 'app.platform');
    if (platform === 'mobile' || platform === 'crx') {
      return (
        <FullLayout>
          { canvasComponent }
        </FullLayout>
      );
    } else {
      // TODO(burdon): Get folder from state.
      let finder = <FolderView folder={ 'inbox' }/>;
      return (
        <SplitLayout nav={ finder }>
          { canvasComponent }
        </SplitLayout>
      );
    }
  }
}

export default CanvasActivity;
