# webpack

- https://webpack.github.io


## Overview

- Uses npm to manage packages.
- Compiles/transforms file (e.g., CSS, JSX).
- Replaces jspm, bower, browserify, etc.
    - https://webpack.github.io/docs/comparison.html


## Config

~~~~
    npm install webpack webpack-dev-server -g

    npm install --save-dev webpack
    npm install --save-dev webpack-dev-server
    
    npm install --save-dev style-loader css-loader          # CSS
    npm install --save-dev less less-loader                 # less
~~~~

- Configuration file: webpack.config.js
    - https://webpack.github.io/docs/configuration.html

- JS Modules
    - Install via "npm --save" and use via "require()"
    - Define plugin declaration in config to estabilsh globals (e.g., jquery $).


## Usage

- To start generator (need to restart if modify config):

~~~~
    webpack                 # To run once (See webpack.config.js)
    webpack --watch         # Auto-update
    npm run webpack         # Start dev server (Auto-updates but not to disk) (see package.json)
~~~~


## Notes

- Loaders do transformations (e.g., JSX, CSS)
    - https://webpack.github.io/docs/list-of-loaders.html
    - https://webpack.github.io/docs/stylesheets.html

- If any library uses babel-polyfill, the main entry point needs to be an array including 'babel-polyfill'.
  See the [babel docs](https://babeljs.io/docs/usage/polyfill/).


## Troubleshooting

- Ensure React components have jsx extension.
- Must restart dev server if renamed file extension (e.g., js -> jsx).
- If you get errors from code that looks like polyfill, such as _iteratorError, see the note above about adding
  to babel-polyfill the entry point.
