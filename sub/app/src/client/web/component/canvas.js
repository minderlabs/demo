//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { ID, MutationUtil, QueryRegistry, TypeUtil } from 'minder-core';
import { Textarea, getWrappedInstance } from 'minder-ux';

import { ItemCanvasHeader } from '../type/item';

import { Navbar } from '../component/navbar';

/**
 * Canvas navbar,
 */
export class CanvasNavbar extends React.Component {

  static propTypes = {
    onSave: React.PropTypes.func.isRequired,
    type:   React.PropTypes.string.isRequired,
    itemId: React.PropTypes.string.isRequired,
    canvas: React.PropTypes.string,
  };

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
  };

  render() {
    let { typeRegistry } = this.context;
    let { onSave, itemId } = this.props;

    let { type } = ID.fromGlobalId(itemId);
    let Toolbar = typeRegistry.toolbar(type);
    let toolbar = Toolbar && <Toolbar/>;

    // TODO(burdon): Save button.
    return (
      <Navbar>
        <ItemCanvasHeader onSave={ onSave } itemId={ itemId } toolbar={ toolbar }/>
      </Navbar>
    );
  }
}

/**
 * Canvas container.
 *
 * <CanvasContainer>                    Instantiated by activity with type-specific content.
 *   <ProjectCanvas>                    Wraps the Canvas element (for consistent layout); provides the mutator.
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
    typeRegistry: React.PropTypes.object.isRequired
  };

  save() {
    let component = getWrappedInstance(this.refs.canvas);
    component.canvas.save();
  }

  render() {
    let { typeRegistry } = this.context;
    let { itemId, canvas } = this.props;

    let { type } = ID.fromGlobalId(itemId);
    let Canvas = typeRegistry.canvas(type, canvas);

    return (
      <div className="ux-canvas-container">
        <Canvas ref="canvas" itemId={ itemId }/>
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

    // Callback to get mutated properties.
    onSave: React.PropTypes.func.isRequired,

    // Type-specific GQL properties.
    refetch: React.PropTypes.func.isRequired,

    // Show description.
    fields: React.PropTypes.object
  };

  static defaultProps = {
    cid: QueryRegistry.createId(),
    fields: {
      debug: true,
      description: true
    }
  };

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
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

  componentWillUnmount() {
    this.save();
    this.context.queryRegistry.unregister(this.props.cid);
  }

  save() {
    let { mutator } = this.context;
    let { item, onSave } = this.props;
    let mutations = TypeUtil.flattenArrays([ this.getMutations(), onSave() ]);
    if (!_.isEmpty(mutations)) {
      mutator.updateItem(item, mutations);
    }
  }

  /**
   * Get mutations for fields.
   */
  getMutations() {
    let { item, fields } = this.props;

    let mutations = [];

    // Determine which properties changed.
    _.each(fields, (exists, field) => {
      let value = _.get(this.state, field);
      if (exists && !_.isEqual(value, _.get(item, field))) {
        // TODO(burdon): Not just strings.
        mutations.push(MutationUtil.createFieldMutation(field, 'string', value));
      }
    });

    return mutations;
  }

  handlePropertyChange(property, value) {
    this.setState({
      [property]: value
    });
  }

  render() {
    let { item, fields, children } = this.props;

    return (
      <div className="ux-canvas">
        { fields['description'] &&
        <div className="ux-section">
          <div className="ux-section-body">
            <div className="ux-row">
              <Textarea className="ux-expand ux-noborder ux-font-xsmall" rows="4"
                        placeholder="Notes"
                        value={ _.get(this.state, 'description') }
                        onChange={ this.handlePropertyChange.bind(this, 'description') }/>
            </div>
          </div>
        </div>
        }

        <div className="ux-column ux-expand">
          { children }
        </div>

        { fields['debug'] &&
        <div className="ux-section ux-debug">
          <div className="ux-section-body">
            { JSON.stringify(_.pick(item, 'bucket', 'type', 'id')) }
          </div>
        </div>
        }
      </div>
    )
  }
}
