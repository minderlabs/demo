//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import ItemList from '../../components/web/item_list';
import CreateItemMutation from '../../mutation/create_item';

import './demo.less';

/**
 * App container.
 */
class DemoApp extends React.Component {

  constructor() {
    super();

    this.state = {
      title: ''
    };
  }

  // TODO(burdon): Redux
  // static propTypes = {
  //   store: React.PropTypes.object.isRequired()
  // };

  handleInputChange(event) {
    this.setState({
      title: event.target.value
    })
  }

  handleKeyUp(event) {
    switch (event.keyCode) {
      case 13: {
        this.handleCreate(event);
        break;
      }
    }
  }

  handleCreate(event) {
    let { user } = this.props;

    let title = this.state.title;
    if (title) {
      this.props.relay.commitUpdate(
        new CreateItemMutation({
          user: user,                   // TODO(burdon): Why not just ID? (see getConfigs parentName.)
          title: title
        })
      );

      this.setState({ title: '' });
    }

    this.refs.input.focus();
  }

  render() {
    let { user } = this.props;

    return (
      <div className="app-panel app-panel-column">
        <h1>{ user.title }</h1>

        <div className="app-section app-expand">
          <ItemList user={user}/>
        </div>

        <div className="app-section app-toolbar">
          <input ref="input" type="text" autoFocus="autoFocus" className="app-expand"
                 value={this.state.title}
                 onChange={ this.handleInputChange.bind(this) }
                 onKeyUp={ this.handleKeyUp.bind(this) }/>

          <button onClick={ this.handleCreate.bind(this) }>Create</button>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(DemoApp, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        title,

        ${ItemList.getFragment('user')},
        ${CreateItemMutation.getFragment('user')}
      }
    `
  }
});
