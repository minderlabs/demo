//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TOOO(trey): Make sure no tabs or and only 2 space indents.

import React, { Component } from 'react';
import { AppRegistry, TextInput, ListView, View , Text } from 'react-native';

// TODO(trey): possibly rename this file to be something more descript
/**
 * NativeApp
 */
export default class NativeApp extends Component {

  constructor(props) {
    super(props);
    // TODO(trey): move listView over to objects, so we can use more than just 
    // string comparison
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = { 
      text: 'Search',
      dataSource: ds
    };

    this.results().then((items) => {
      // TODO(trey): try to find out if there's a setter method instead of cloning
      this.setState({dataSource: ds.cloneWithRows(items)});
    });
  }

  results() {
    // NOTE(trey): genymotion sets up a proxy to localhost on this ip address.
    return fetch('http://10.0.3.2:8080/data/test.json')
      .then((response) => response.json())
      .then((json) => {
        return json.items.map((item) => item.title);
      })
      .catch((error) => {
        // TODO(trey): give a better user-facing error
        console.error(error);
      });
  }

  render() {
    return (
      <View>
        <TextInput
          style={{height: 40, borderColor: 'gray', borderWidth: 1}}
          onChangeText={(text) => this.setState({ text: text })}
          value={this.state.text}
        />
        <ListView
          dataSource={this.state.dataSource}
          renderRow={(rowData) => <Text>{rowData}</Text>}
        />
      </View>
    );
  }
}
