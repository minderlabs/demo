//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import { ID } from 'minder-core';

import BaseLayout from '../layout/base';
import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';

import { TypeRegistry } from '../component/type/registry';
import FinderView from '../view/finder';

/**
 * Canvas Activity.
 */
export default class CanvasActivity extends React.Component {

  /**
   * Properties set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      type: React.PropTypes.string,
      itemId: React.PropTypes.string
    })
  };

  static contextTypes = {
    injector: React.PropTypes.object.isRequired
  };

  render() {
    let { params, folder } = this.props;
    let { canvas, itemId } = params;
    let { type } = ID.fromGlobalId(itemId);

    // TODO(burdon): Don't put injector in context. Instead inject required objects?
    // TODO(burdon): TypeRegistry canvas(type) should return appropriate object.
    let typeRegistry = this.context.injector.get(TypeRegistry);

    // TODO(burdon): Rename canvas.
    let content = typeRegistry.canvas(type, itemId, canvas);

    // TODO(burdon): Layout based on form factor.
    // TODO(burdon): If canvas is board then use MainLayout. Ask canvas which layout it prefers?
    if (BaseLayout.isMobile() || content.props.expand) {
      return (
        <FullLayout>
          { content }
        </FullLayout>
      )
    } else {
      let finder = <FinderView folder={ folder }/>;
      return (
        <SplitLayout nav={ finder }>
          { content }
        </SplitLayout>
      )
    }
  }
}
