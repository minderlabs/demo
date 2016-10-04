'use strict';

import React, { Component } from 'react';
import { AppRegistry, TextInput, ListView, View , Text } from 'react-native';
import Search from '../models/search'

export default class NativeApp extends Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    let results = [];
    for (let i=0; i < 10; i++) {
        results.push(""+i);
    }
    this.state = { 
      text: 'Search',
      dataSource: ds.cloneWithRows(results)
    };
  }

  onUpdate(text) {
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    let results = [];
    for (let i=0; i < 10; i++) {
        results.push(""+i);
    }
    this.setState({
      text: text,
      dataSoruce: ds.cloneWithRows(results)
    });
  }

  render() {
    return (
      <View style={{paddingTop: 22}}>
        <TextInput
          style={{height: 40, borderColor: 'gray', borderWidth: 1}}
          onChangeText={(text) => this.onUpdate(text)}
          value={this.state.text}
        />
        <View style={{paddingTop: 22}}>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={(rowData) => <Text>{rowData}</Text>}
        />
        </View>
      </View>
    );
  }
}
