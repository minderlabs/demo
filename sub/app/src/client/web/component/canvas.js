//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { QueryRegistry } from 'minder-core';

/**
 * Canvas container.
 *
 * <CanvasContainer>
 *   <ProjectCanvas/>
 *     <Canvas>
 *       <div>{ customLayout }</div>
 *     </Canvas>
 *   </ProjectCanvas>
 * </CanvasContainer>
 *
 * The container uses the TypeRegistry to obtain the custom canvas HOC.
 *
 */
export class CanvasContainer extends React.Component {

  static propTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
    itemId: React.PropTypes.string.isRequired,
    canvas: React.PropTypes.string
  };

  render() {
    let { typeRegistry, itemId, canvas } = this.props;

    return (
      <div className="ux-canvas-container">
        { typeRegistry.canvas(itemId, canvas) }
      </div>
    );
  }
}

/**
 * Canvas wrapper.
 */
export class Canvas extends React.Component {

  static propTypes = {
    refetch: React.PropTypes.func.isRequired,
    item: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    cid: QueryRegistry.createId()
  };

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired
  };

  componentWillMount() {
    this.context.queryRegistry.register(this.props.cid, this.props.refetch);
  }

  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
  }

  handleRefresh() {
    this.props.refetch();
  }

  render() {
    let { item, children } = this.props;

    return (
      <div className="ux-canvas">
        <div>
          <h1>{ item.title }</h1>
        </div>
        <div>
          { children }
        </div>
        <div>
          <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
        </div>
      </div>
    )
  }
}
