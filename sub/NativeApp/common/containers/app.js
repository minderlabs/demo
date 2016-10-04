'use strict';

import React, { Component } from 'react';
import { AppRegistry, TextInput, ListView, View , Text } from 'react-native';
import Search from '../models/search'

export default class NativeApp extends Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = { 
      text: 'Search',
      dataSource: ds
    };

    this.results().then((items) => {
       this.setState({dataSource: ds.cloneWithRows(items)});
    });
  }

  results() {
    return fetch('http://10.0.3.2:8080/data/test.json')
      .then((response) => response.json())
      .then((responseJson) => {
        return responseJson.items.map((result) => result.title);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  render() {
    return (
      <View style={{paddingTop: 22}}>
        <TextInput
          style={{height: 40, borderColor: 'gray', borderWidth: 1}}
          onChangeText={(text) => this.setState({"text": text})}
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
