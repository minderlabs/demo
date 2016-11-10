# Web Demo

## Gettting started

~~~~
    npm update
    npm run build
    npm run start
~~~~

The [GraphiQL](https://github.com/graphql/graphiql) (interactive GraphQL) interface is exposed at
http://localhost:8080/graphql

Note that the server-side javascript is run through babel using babel-node, and then watched using nodemon.
See https://github.com/babel/example-node-server

TODO(madadam): Don't do this in production. See https://github.com/babel/example-node-server#getting-ready-for-production-use


## Toolchain and Configuration

~~~~
  npm start                                                     NODE_ENV=hot|development|production
    => nodemmon                         nodemon.json
      => express
        => webpack-dev-middleware
          => webpack-hot-middleware
            => webpack                  webpack.config.js
              => babel                  .babelrc                BABEL_ENV=development|production|react-native|server

  karma                                 karma.conf.js
    => webpack                          webpack-karma.config.js
~~~~


## Running the Server

- nodemon restarts updated node scripts. [https://github.com/remy/nodemon]



## Running Android

- Create/start Genymotion virtual device.

~~~~
    adb devices
    react-native run-android
~~~~

- NOTE: access localhost from the Genymotion virtual machine: http://10.0.3.2
- Press R-R to refresh app


## Notes

- FB file extension standard for JSX is .js (.jsx doesn't work with the react native packager, and likely won't be supported).
    - https://github.com/facebook/react-native/pull/5233#discussion_r49682279 


## Refs

- Getting started guide:
  - https://www.codementor.io/reactjs/tutorial/beginner-guide-setup-reactjs-environment-npm-babel-6-webpack

- React developer tools:
  - https://facebook.github.io/react/blog/2015/09/02/new-react-developer-tools.html

- Common code across web and native components:
  - http://jkaufman.io/react-web-native-codesharing

- To rename project:
  - http://blog.skypayjm.com/2016/07/renaming-react-native-project.html
  - AndroidManifest.xml


## Troubleshooting

TODO(burdon): Global log of troubleshooting issues by category.

- TODO(burdon): Enable server errors/logging (e.g., asserts ignored).

- Server side (schema) errors:
  - 400: invalid mutation params:
    - Check GraphQLNonNull constraints

- Karma can't find plugin
    - npm i -g karma-cli

- ERR_INCOMPLETE_CHUNKED_ENCODING
    - cannot use HMR with nodemon


### react-native run-android:

  - ERROR: Error watching file for changes: EMFILE
    - https://github.com/facebook/react-native/issues/10028
      - brew install watchman

  - ERROR: New react-native app has 'TypeError: babelHelpers.typeof is not a function'
    - http://stackoverflow.com/questions/35563025/new-react-native-app-has-typeerror-babelhelpers-typeof-is-not-a-function-ios
      - ./node_modules/react-native/packager/packager.sh start --reset-cache