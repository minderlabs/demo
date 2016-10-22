//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { AppRegistry, TextInput, ListView, View, Text } from 'react-native';

// NOTE: Genymotion sets up a proxy to localhost on this ip address.
const LOCALHOST = 'http://10.0.3.2:8080';

const API = '/data/';

/**
 * NativeApp
 */
export default class DemoApp extends React.Component {

  constructor(props) {
    super(props);

    // TODO(burdon): Factor out to common/model.
    // TODO(burdon): rowHasChanged should depend on item.id and item.version
    // https://facebook.github.io/react-native/docs/listviewdatasource.html
    const dataSource = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

    this.state = {
      text: '',
      dataSource: dataSource
    };

    this.handleUpdate().then((items) => {
      this.setState({
        dataSource: dataSource.cloneWithRows(items)
      });
    });
  }

  handleUpdate() {
    // TODO(burdon): Move to common model class (with web app).
    return fetch(LOCALHOST + API + 'test.json')
      .then((response) => response.json())
      .then((json) => {
        return json.items.map((item) => item.title);
      });
  }

  render() {
    return (
      <View>
        <TextInput
          onChangeText={ (text) => this.setState({ text: text }) }
          value={ this.state.text }
        />

        <ListView
          dataSource={ this.state.dataSource }
          renderRow={ (rowData) => <Text>{ rowData }</Text> }
        />
      </View>
    );
  }
}
