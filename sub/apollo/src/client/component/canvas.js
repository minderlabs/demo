//
// Copyright 2017 Minder Labs.
//

import React from 'react';

/**
 * Canvas container.
 */
export class CanvasContainer extends React.Component {

  // TODO(burdon): Unify Card detail and board etc. to have common CanvasContainer.
  // TODO(burdon): Don't require each sub component to declare this (e.g., instantiate in CanvasActivity).

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    cid: new Date().getTime()
  };

  componentWillMount() {
    this.context.queryRegistry.register(this.props.cid, this.props.refetch);
  }

  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
  }

  render() {
    let { children } = this.props;

    return (
      <div className="ux-canvas">{ children }</div>
    )
  }
}
