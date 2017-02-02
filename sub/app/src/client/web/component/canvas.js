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

  // TODO(burdon): Save (get mutations from child via prop).
  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
  }

  handleRefresh() {
    this.props.refetch();
  }

  render() {
    let { item, children } = this.props;

    // TODO(burdon): Render textbox, textarea and toolbar.
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






// TODO(burdon): Port Canvas.
export class OldCardContainer extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired
  };

  static childContextTypes = {

    /**
     * TODO(burdon): Provide onMutation callback instead and coordiate from here instead?
     * NOTE: Assumes all mutations are based from this HOC mutation type.
     */
    mutator: React.PropTypes.object
  };

  static propTypes = {

    /**
     * Data refetch.
     */
    refetch: React.PropTypes.func.isRequired,

    /**
     * The component is initially rendered before the query executes.
     */
    item: React.PropTypes.object,

    /**
     * Provided by Mutator.graphql() below (but not when the component is first instantiated).
     */
    mutator: React.PropTypes.object,

    /**
     * Called before item is saved.
     * @return {[Mutation]} array of mutations (or null).
     */
    onSave: React.PropTypes.func
  };

  static defaultProps = {
    cid: new Date().getTime()
  };

  state = {};

  getChildContext() {
    return {
      mutator: this.props.mutator
    };
  }

  /**
   * Auto-save when item chages.
   */
  componentWillReceiveProps(nextProps) {
    if (_.get(this.state, 'id') != _.get(nextProps, 'item.id')) {
      this.setState(_.pick(nextProps.item, ['id', 'title', 'description']));
    }
  }

  componentWillMount() {
    this.context.queryRegistry.register(this.props.cid, this.props.refetch);
  }

  /**
   * Auto-save whe component is removed.
   */
  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
    let { item } = this.props;
    if (item) {
      this.maybeSave();
    }
  }

  /**
   * Check for modified elements and submit mutation if necessary.
   */
  maybeSave() {
    // TODO(burdon): Get mutator from context? Or from Redux?
    let { mutator, item } = this.props;

    let mutations = [];

    // Common properties.
    _.each(['title', 'description'], property => {
      let value = _.get(this.state, property);
      if (!_.isEqual(value, _.get(item, property))) {
        mutations.push(MutationUtil.createFieldMutation(property, 'string', value));
      }
    });

    // Get type-specific values.
    this.props.onSave && TypeUtil.maybeAppend(mutations, this.props.onSave());

    if (mutations.length) {
      mutator.updateItem(item, mutations);
    }
  }

  handlePropertyChange(property, value) {
    this.setState({
      [property]: value
    });
  }

  /**
   * Renders the outer card, with content from type-specific item.
   */
  render() {
    let { children, debug, item={}, typeRegistry, onToggleCanvas } = this.props;
    let { title, description } = this.state;

    let debugSection = debug && (
      <div className="ux-section ux-debug">
        { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
      </div>
    );

    return (
      <div className="ux-card ux-column">
        <div className="ux-panel ux-noshrink">
          <div className="ux-section ux-row">
            <i className="ux-icon"
               onClick={ onToggleCanvas }>{ typeRegistry.icon(item) }</i>

            <TextBox className="ux-expand"
                     value={ title }
                     onChange={ this.handlePropertyChange.bind(this, 'title') }/>

            <div>
              <i className="ux-icon ux-icon-action ux-icon-save" onClick={ this.maybeSave.bind(this) }>save</i>
            </div>
          </div>

          <div className="ux-row">
            <Textarea className="ux-expand ux-noborder ux-font-xsmall" rows="3"
                      placeholder="Notes"
                      value={ description }
                      onChange={ this.handlePropertyChange.bind(this, 'description') }/>
          </div>

          { debugSection }
        </div>

        <div className="ux-scroll-container">
          <div className="ux-scroll-panel">
            { children }
          </div>
        </div>
      </div>
    );
  }
}
