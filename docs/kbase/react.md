# React

TODO(burdon): Clean up, consolidate.

## Overview

- Create JSX files (JS with template markup).
- Use with webpack


## Best Practice

- Always use composition over inheritance (contain, dispatch, etc.)
    (https://facebook.github.io/react/docs/composition-vs-inheritance.html)


## Structure

Component (class or render function) <= Instance <= DOM Element.

- https://facebook.github.io/react/blog/2015/12/18/react-components-elements-and-instances.html


### Hermetic

React components should not access child components other than setting properties.
Instead use Flex to set the global state and have the child react accordingly.

- https://github.com/facebook/react/issues/6646#issuecomment-215580357

Otherwise use withRef (which doesn't currently work).

- http://dev.apollodata.com/react/higher-order-components.html#with-ref


## Config

~~~~
    npm install --save react react-dom
    npm install --save-dev babel-loader babel-core babel-preset-es2015 babel-preset-react
~~~~

Install Chrome Extension:
- https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi/related


## Notes

- https://facebook.github.io/react
- https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html

- https://robots.thoughtbot.com/setting-up-webpack-for-react-and-hot-module-replacement
- http://jslog.com/2014/10/02/react-with-webpack-part-1


## Libraries

~~~~
    npm install --save material-design-lite                 # MDL (if using stand-alone)
    npm install --save material-ui                          # material-ui
    npm install --save react-tap-event-plugin               # Temp dependency
~~~~


## Primer

- JSX files that contain JS and templates (processed via webpack/babel).
- Apps contain a tree of components.

- Components have:
    - this.state        internal state.
    - this.props        properties passed in by parent.
    - this.context      properites configured to be passed through the component tree (not available in constructor).
    - this.refs         named components.

- Components should define a model class which is provided as a property (i.e., MVP).

~~~~
    class Foo extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {};
      }
    }
~~~~


## Components

- Component templates may access state/props and member functions:

- Components should be implemented as classes:
    - http://babeljs.io/blog/2015/06/07/react-on-es6-plus
    - https://facebook.github.io/react/blog/2015/01/27/react-v0.13.0-beta-1.html#es6-classes
    
- https://facebook.github.io/react/docs/tutorial.html
- https://facebook.github.io/react/docs/thinking-in-react.html


~~~~
    [hello.jsx]

    // Component
    class Application extends React.Component {
      
      handleClick() {
        // Do shallow merge of state.
        this.setState({ ... });               // NOTE: Can optionally supply callback (since setState is async).
      }
    
      render() { 
        return (
          {/* comment */}
          <h1>{this.props.title}</h1>
          <button onClick={ this.handleClick.bind(this) }>Ping</button>
        ); 
      }
    };

    ReactDOM.render(
      <Application title="Hello World"/>, document.body
    );
~~~~


~~~~
    <button onClick={ this.update }>Test</button>
~~~~


- Component renderers generate subcomponents based on state.
    - When the state is updated, the template is re-rendered.
    - Repeated items must define a "key" attribute.

~~~~
    class Application extends React.Component {
      constructor(props, context) {
        super(props, context);

        this.state = { result: [] };
      }

      // NOTE: item is bound to handler.
      handleClick(item, ev) {}

      render() {
        let items = this.state.result.map((item) => {
          return (
            <Item key={ item.id } title={ item.title } onClick={ this.handleClick.bind(this, item) }/>
          )
        });

        return (
          <div>{items}</div>
        );
      }
    }
    
    Application.propTypes = { initialCount: PropTypes.number.isRequired };
    Application.defaultProps = { initialCount: 0 };
~~~~


- Controlled components
  - https://facebook.github.io/react/docs/forms.html#controlled-components
  - Value doesn't change unless state is set by onChange
  - Otherwise "uncontrolled"
  - NOTE: if set initial value to null (not '') then get:
    WARNING: changing an uncontrolled input of type text to be controlled
  
~~~~
    onChange(event) { this.setState({value: event.target.value}); }    
    render() { return (<input type='text' value={ this.state.value } onChange={ this.handleChange.bind(this) }); }
~~~~


- Conditional layout.

~~~~
    {(() => {
      switch (this.props.type) {
        case 'alert': {
          return <i className="nx-icon material-icons">bookmark_border</i>
        }
        case 'bookmark': {
          return <i className="nx-icon material-icons">bookmark_border</i>
        }
      }
    })()}
~~~~


NOTE: conditionally adding/removing components within render causes the component's state to be lost when detached.
Alternatively, make elements conditionally visible. E.g., 

~~~~
    <div style={ {'display': this.state.show ? 'block' : 'none' } }>
      ...
    </div>
~~~~


- https://facebook.github.io/react/tips/if-else-in-JSX.html
    - Using arrow functions:
        - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions

~~~~
    { (() => { 
      if (foo) {
        return <div>{ foo }</div>
      } 
    })() }
~~~~


### Rendering

- INPUT being reset
  - http://stackoverflow.com/questions/36267844/how-is-react-able-to-suppress-the-change-of-the-input-field-value
  - https://facebook.github.io/react/docs/react-component.html

### Gotchas

- https://facebook.github.io/react/docs/jsx-gotchas.html

~~~~
    // Custom attributes.
    <div data-my-attr=""></div>
~~~~


### Context

- https://facebook.github.io/react/docs/context.html
- https://facebook.github.io/react/docs/context.html#parent-child-coupling

~~~~
    <Parent>
     <Child/>
    </Parent>

    //
    // Parent
    //

    class Parent extends React.Component {    
      constructor(props, context) {
        super(props, context);
      }
    
      getChildContext() {
        return {
          callback: this.handleCallback.bind(this)
        }
      }
      
      handleCallback() {}

      render() {
        return (
          <div>{ this.props.children }</div>
        );
      }
    }
    
    Parent.childContextTypes = {            // NOTE: childContext
      callback: PropTypes.func
    };

    //
    // Child
    //

    class Child extends React.Component {
      constructor(props, context) {
        super(props, context);
      }
      
      render() {
        return (
          <div onClick={ this.context.callback() }>{ this.props.children }</div>
        );
      }
    }
    
    Child.contextTypes = {                  // NOTE: context
      callback: PropTypes.func
    };
~~~~  



## Refs

- https://facebook.github.io/react/docs/more-about-refs.html

~~~~
    // binds the DOM node to the member variable.
    <input ref={ (c) => this._input = c }/>;

    // binds the React class instance to the member variable.
    <TextInput ref={ (c) => this._input = c }/>;
~~~~


## Advanced

- https://facebook.github.io/react/docs/component-specs.html
- http://andrewhfarmer.com/component-communication


## Troubleshooting

- ERROR: "changing an uncontrolled input of type text to be controlled."
    - setting input values to undefined makes the input uncontrolled, so setting the first value changes the mode.
    - Solution: <input value={ this.state.value || '' }/>

- All files that use react binding (even if not components) must include:
    - import React from 'react';

- Errors in templates may fail silently.
    
- Multiple versions
    - https://medium.com/@dan_abramov/two-weird-tricks-that-fix-react-7cf9bbdef375#.mu2r8lymf
