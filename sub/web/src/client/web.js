//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Carousel, Jumbotron, Modal, Nav, Navbar, NavItem, Panel } from 'react-bootstrap';

import 'bootstrap-css';

import './web.less';

//
// https://react-bootstrap.github.io/components.html (v3)
// TODO(burdon): Themes: https://bootswatch.com
// TODO(burdon): v4: Cards (http://bootstrap4.guide)
//

const ControlledCarousel = React.createClass({
  getInitialState() {
    return {
      index: 0,
      direction: null
    };
  },

  handleSelect(selectedIndex, e) {
    console.log('selected=' + selectedIndex + ', direction=' + e.direction);
    this.setState({
      index: selectedIndex,
      direction: e.direction
    });
  },

  render() {
    return (
      <Carousel activeIndex={ this.state.index } direction={ this.state.direction } onSelect={ this.handleSelect }>
        <Carousel.Item>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="/>
          <div className="container">
            <Carousel.Caption>
              <h3>First slide label</h3>
              <p>Nulla vitae elit libero, a pharetra augue mollis interdum.</p>
            </Carousel.Caption>
          </div>
        </Carousel.Item>
        <Carousel.Item>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="/>
          <div className="container">
            <Carousel.Caption>
              <h3>Second slide label</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </Carousel.Caption>
          </div>
        </Carousel.Item>
        <Carousel.Item>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="/>
          <div className="container">
            <Carousel.Caption>
              <h3>Third slide label</h3>
              <p>Praesent commodo cursus magna, vel scelerisque nisl consectetur.</p>
            </Carousel.Caption>
          </div>
        </Carousel.Item>
      </Carousel>
    );
  }
});

const App = (
  <div>
    <header className="banner">
      <Navbar inverse collapseOnSelect fixedTop>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">minderlabs.com</a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav pullRight>
            <NavItem eventKey={ 1 } href="#">About</NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </header>

    <div className="container">
      <div className="container">
        <Jumbotron>
          <h1>minder</h1>
          <p>Rethink how you collaborate.</p>
          <p><Button bsStyle="primary">Learn more</Button></p>
        </Jumbotron>
      </div>

      <div className="container">
        <ControlledCarousel/>
      </div>
    </div>
  </div>
);

ReactDOM.render(App, $('#root')[0]);

console.log('OK');
