//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import ItemList from '../../components/web/item_list';

import './demo.less';

/**
 * App container.
 */
class DemoApp extends React.Component {

  // TODO(burdon): Redux
  // static propTypes = {
  //   store: React.PropTypes.object.isRequired()
  // };

  constructor(props, context) {
    super(props, context);
  }

  handleRefresh() {
    // TODO(burdon): Reissue query?
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
    let title = this.refs.input.value;
    if (title) {
      console.log('Create new item: ' + title);
      // FIXME implement
    }
    this.refs.input.focus();
  }

  render() {
    const {user} = this.props;

    // TODO(burdon): Factor out input bar.

    return (
      <div className="app-panel app-panel-column">
        <h1>{ this.props.title }</h1>

        <div className="app-section app-toolabar">
          <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
        </div>

        <div className="app-section app-expand">
          <ItemList user={user}/>
        </div>

        <div className="app-section app-toolbar">
          <input ref="input" type="text" autoFocus="autoFocus" className="app-expand"
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
        ${ItemList.getFragment('user')}
      }
    `
  }
});
