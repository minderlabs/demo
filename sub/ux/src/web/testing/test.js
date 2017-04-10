//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory, Route, Router } from 'react-router'

import TestBoard from './test_board';
import TestDragBoard from './dnd/board';
import TestList from './test_list';
import TestSidebar from './test_sidebar';
import TestText from './test_text';

import './test.less';

// TODO(burdon): For offline testing, load material-icons locally.

// TODO(burdon): Proxy to allow routes.
// http://stackoverflow.com/questions/26203725/how-to-allow-for-webpack-dev-server-to-allow-entry-points-from-react-router

class KitchenSink extends React.Component {

  static Components = [
    {
      id: 'text',
      name: 'Text',
      render: () => <TestText/>
    },
    {
      id: 'list',
      name: 'List',
      render: () => <TestList/>
    },
    {
      id: 'board',
      name: 'Board',
      render: () => <TestBoard/>
    },
    {
      id: 'drag',
      name: 'Drag',
      render: () => <TestDragBoard/>
    },
    {
      id: 'sidebar',
      name: 'Sidebar',
      render: () => <TestSidebar/>
    }
  ];

  state = {
    component: KitchenSink.Components[0]
  };

  handleSelectChanged(event) {
    this.setState({
      component: _.find(KitchenSink.Components, component => component.id === event.target.value)
    });
  }

  render() {
    let { component } = this.state;

    return (
      <div className="test-panel">
        <div className="test-header">
          <select value={ component.id } onChange={ this.handleSelectChanged.bind(this) }>
          { _.map(KitchenSink.Components, component => (
            <option key={ component.id } value={ component.id }>{ component.name }</option>
          ))}
          </select>
        </div>

        <div className="test-container">
          { component.render() }
        </div>
      </div>
    );
  }
}

const App = (
  <Router history={ browserHistory }>
    <Route path="/" component={ KitchenSink }/>
  </Router>
);

ReactDOM.render(App, document.getElementById('test-container'));
