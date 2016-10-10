# Web Demo

## Gettting started

~~~~
    npm update

    npm run build
    npm run start
~~~~


## Running the server

~~~~
    npm run build
    npm run server
~~~~

The [GraphiQL](https://github.com/graphql/graphiql) (interactive GraphQL) interface is exposed at
http://localhost:8080/graphql

Note that the server-side javascript is run through babel using babel-node, and then watched using nodemon.
See https://github.com/babel/example-node-server

TODO(madadam): Don't do this in production. See https://github.com/babel/example-node-server#getting-ready-for-production-use


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
