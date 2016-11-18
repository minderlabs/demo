//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import { shallow } from 'enzyme';

// TODO(burdon): Test relay.
// TODO(burdon): Test relay against fake server.
// TODO(burdon): Test react-native.

//
// Enzyme sanity tests.
// http://airbnb.io/enzyme/docs/installation/index.html (NOTE: out of date re react versions; use latest >=15.0).
//

/**
 * Test component.
 */
class TestComponent extends React.Component {

  render() {
    return (
      <div>Test</div>
    );
  }
}

/**
 * Sanity tests using mocha.
 * http://airbnb.io/enzyme/docs/guides/mocha.html
 */
describe('<TestComponent/>', () => {
  it('renders the <TestComponent/> component', () => {
    const wrapper = shallow(<TestComponent/>);
    expect(wrapper.first().text()).to.equal('Test');
  });
});
