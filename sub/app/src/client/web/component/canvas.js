//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { MutationUtil, QueryRegistry, TypeUtil } from 'minder-core';
import { Textarea, TextBox } from 'minder-ux';

/**
 * Canvas container.
 *
 * <CanvasContainer>                    Instantiated by activity with type-specific content.
 *   <ProjectCanvas/>                   Wraps the Canvas element (for consistent layout); provides the mutator.
 *     <Canvas>
 *       <div>{ customLayout }</div>
 *     </Canvas>
 *   </ProjectCanvas>
 * </CanvasContainer>
 *
 * The container uses the TypeRegistry to obtain the custom canvas HOC.
 */
export class CanvasContainer extends React.Component {

  static propTypes = {
    type: React.PropTypes.string.isRequired,
    itemId: React.PropTypes.string.isRequired,
    canvas: React.PropTypes.string,
  };

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
  };

  render() {
    let { typeRegistry } = this.context;
    let { itemId, canvas } = this.props;

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

    // Root item (retrieved by type-specific GQL query).
    item: React.PropTypes.object.isRequired,

    // Type-specific GQL properties.
    refetch: React.PropTypes.func.isRequired,

    // Read-only if not set.
    mutator: React.PropTypes.object,

    // TODO(burdon): Move to custom menu.
    // Get mutations from child component.
    onSave: React.PropTypes.func,

    // Custom menu component.
    menu: React.PropTypes.object,
  };

  static defaultProps = {
    cid: QueryRegistry.createId()
  };

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired
  };

  /**
   * State contains editable fields.
   */
  state = {};

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

  // TODO(burdon): Save (get mutations from child via prop).
  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
  }

  handlePropertyChange(property, value) {
    this.setState({
      [property]: value
    });
  }

  /**
   * Check for modified elements and submit mutation if necessary.
   */
  handleSave() {
    let { mutator, item } = this.props;
    if (!mutator) {
      console.warn('Read-only canvas.');
      return;
    }

    let mutations = [];

    // Determine which properties changed.
    _.each(['title', 'description'], property => {
      let value = _.get(this.state, property);
      if (!_.isEqual(value, _.get(item, property))) {
        mutations.push(MutationUtil.createFieldMutation(property, 'string', value));
      }
    });

    // Get type-specific mutations.
    this.props.onSave && TypeUtil.maybeAppend(mutations, this.props.onSave());

    if (mutations.length) {
      mutator.updateItem(item, mutations);
    }
  }

  render() {
    // TODO(burdon): Rename menu => buttons.
    let { item, debug, menu, children } = this.props;
    let { title, description } = this.state;

    // TODO(burdon): Canvas header (in navbar).
    return (
      <div className="ux-canvas">
        <div>
          <div className="ux-columns">
            <TextBox className="ux-expand ux-noborder ux-font-large"
                     value={ title }
                     onChange={ this.handlePropertyChange.bind(this, 'title') }/>

            <div className="ux-canvas-menu-bar">
              { menu }

              <div className="ux-bar">
                <i className="ux-icon ux-icon-action"
                   onClick={ this.handleSave.bind(this) }>save</i>
              </div>
            </div>
          </div>

          <div className="ux-row">
            <Textarea className="ux-expand ux-noborder ux-font-xsmall" rows="3"
                      placeholder="Notes"
                      value={ description }
                      onChange={ this.handlePropertyChange.bind(this, 'description') }/>
          </div>
        </div>

        { debug &&
        <div className="ux-section ux-debug">
          { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
        </div>
        }

        <div className="ux-expand">
          { children }
        </div>
      </div>
    )
  }
}
