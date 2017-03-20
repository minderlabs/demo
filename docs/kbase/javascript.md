# JavaScript

## ES6

- ES2015 (Formerly ES6)
- Chrome supports a subset of ES6 in strict mode: i.e., 'use strict' (via chrome://flags/#enable-javascript-harmony)
- https://developers.google.com/web/shows/ttt/series-2/es2015?hl=en
- [Against Mixins](<https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750>)


### Modules

~~~~
    # lib.js
    modules.exports = { version: '0.0.1' };

    # client.js
    let config = require('./lib');
~~~~

- Use webpack.config to define globals (e.g., new webpack.ProvidePlugin({ $: 'jquery' }))


### ES6 Fragments

- http://es6-features.org


#### Named Exports

~~~~
    // foo.jsx
    export class Foo {}
    
    // bar.jsx
    import { Foo } from './foo';
~~~~


#### Default Exports

- Name a single global export (e.g., for library entrypoint).
- https://24ways.org/2014/javascript-modules-the-es6-way

~~~~
    // foo.jsx
    class Foo {}
    export default Foo;
    
    // bar.jsx
    import Foo from './foo';
~~~~


#### Rules

- USE getter methods (i.e., get foo()) BUT DON'T USE setter methods (i.e., set foo()). Causes silent failures and confusion.

- USE Arrow Functions instead of bind(this) OR var self = this;

    - http://stackoverflow.com/questions/22939130/when-should-i-use-arrow-functions-in-ecmascript-6

~~~~
    function(p) { return this.foo(p); }.bind(this); 

    // BECOMES:
    
    (p) => ( return this.foo(p); }
~~~~

Examples:

~~~~
    new Promise((resolve, reject) => {});
    new Promise((resolve) => { setTimeout(() => { resolve(100); }); }).then((r) => { console.log(r); return 200; }).then((r) => { console.log(r); });
    
    100
    200 // NOTE: Value returned from first then() is passed to the next.
~~~~

- promises

    - composition:
        - Promise.all([firstThingAsync, secondThingAsync])
        - promises can be chained; so they can be resolved locally, then passed down the execution chain to
          calling functions that receive the promise.

~~~~
    // Resolve all (potentially async) values, then do X, then do Y.

    function doAsync(values) {
      return new Promise.all(values).then(function() { console.log('X'); });
    }

    doAsyn(values).then(function() { console.log('Y'); });
~~~~

    - throw for exceptions; reject with values.

        - https://blog.domenic.me/youre-missing-the-point-of-promises
        - http://stackoverflow.com/questions/23803743/what-is-the-explicit-promise-construction-antipattern-and-how-do-i-avoid-it
        - http://stackoverflow.com/questions/22539815/arent-promises-just-callbacks/22562045#22562045

#### Misc

~~~~
    // Loops
    let map = new Map();
    for (let key in map) {}
    for (let value of map) {}
    for (let [key, value] of map) {}
    Array.from(map.keys());

    // Bind
    setTimeout(function() {
      this.ok():
    }.bind(this));

    setTimeout(this.callback.bind(this));

    // Promises
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
    new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve('ok');
      });
    })
      .then(function(value) { console.log(value); })
      .catch(function(ex) { console.error(ex); });

    // Types
    Array.from(new Map());
    
    // Classes
    class Foo {
      toString() {
        return 'Foo()';         # Called by String(new Foo());
      }
    }
    
    m = new Map();
    m.size.
    Array.from(m.keys());
~~~~


### Refs

- https://github.com/lukehoban/es6features#readme
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
- https://github.com/getify/You-Dont-Know-JS/blob/master/this%20&%20object%20prototypes/ch1.md
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/New_in_JavaScript/ECMAScript_6_support_in_Mozilla
- https://kangax.github.io/compat-table/es6

- Windows
    - http://kangax.github.io/nfe


## Babel (Transpiler)

- https://babeljs.io/docs/learn-es2015

- Babel transforms JS into standared ES5 that can run in any browser.
  - console.chrome is non-standard and removed by Babel.
  - PhantomJS is a "headless" browser that can be used for automated tests.

- Alt. Traceur


## Karma (Test Runner)

- Test Runner
- http://karma-runner.github.io/0.13/config/configuration-file.html
- https://www.npmjs.com/browse/keyword/karma-plugin


## Jasmine (Test Framework)


## Troubleshooting

- TypeError: undefined is not a constructor
    - Check class is exported.
    
    




