# Apollo



TODO(burdon): Apollo Evaluation:
https://www.reindex.io/blog/redux-and-relay
https://dev-blog.apollodata.com/apollo-client-graphql-with-react-and-redux-49b35d0f2641#.ovjpku8rm
https://medium.com/@codazeninc/choosing-a-graphql-client-apollo-vs-relay-9398dde5363a#.cf5fsaska
https://medium.freecodecamp.com/tutorial-how-to-use-graphql-in-your-redux-app-9bf8ebbeb362#.m5mpkzy7k

TODO(burdon): Fragment composition
https://github.com/facebook/graphql/issues/204 (ARGS IN FRAGMENTS)>>>>>> stubailo
https://github.com/apollostack/react-apollo/issues/140
http://dev.apollodata.com/core/fragments.html
http://graphql.org/learn/queries/#fragments
createFragment vs new Fragment
Try declaring vars in fragment (does it automatically get passed down?)

TODO(burdon): Subscriptions.
https://github.com/apollostack/graphql-subscriptions (Redis/Rethink)
http://dev.apollodata.com/react/receiving-updates.html#Subscriptions
TODO(burdon): Caching (mobile/offline roadmap)?
http://dev.apollodata.com/react/receiving-updates.html
TODO(burdon): Native?
TODO(burdon): Optimistic UI.
TODO(burdon): Update cache with updateQueries.


Benefits over Relay:
 - simplicity
   - micro-frameworks
   - native schema with separate resolvers
   - client syntax
   - no magic
   - tools
 - redux
   - state machine (HUGE benefit for complex apps)
   - tools
 - Relay 2.0 looks sketchy (and moving towards Apollo)



## Troubleshoorting:

- ERROR: [index.js Uncaught SyntaxError: Unexpected token export]
    - Babel (ES2015) not invoked (see "require" in webpack bundle).
        - Check submodule's .babelrc set-up.
        - Check webpackLinkPlugin configures submodule.

- ERROR: [Uncaught Error: addComponentAsRefTo(...): Only a ReactOwner can have refs. You might be adding a ref to a component that was not created inside a component's `render` method, or you have multiple copies of React loaded]
    - npm-link brings in multiple copies (of graphql and react, etc.)
    - https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
        Multiple copies of React
        Bower does a good job of deduplicating dependencies, but NPM does not. If you aren't doing anything (fancy) with refs, there is a good chance that the problem is not with your refs, but rather an issue with having multiple copies of React loaded into your project. Sometimes, when you pull in a third-party module via npm, you will get a duplicate copy of the dependency library, and this can create problems.
        If you are using npm... npm ls or npm ls react might help illuminate.
    - https://github.com/callemall/material-ui/issues/2818
    - https://github.com/npm/npm/issues/7742
    - Solution:
        - http://stackoverflow.com/questions/31169760/how-to-avoid-react-loading-twice-with-webpack-when-developing

- ERROR: "Also ensure that there are not multiple versions of GraphQL installed in your node_modules directory."
     NOTE: Can't create the schema in one module and use it with graphqlExpress in another (via npm link)
     Cannot factor out schema creation since dependency on minder-graphql creates multiple
     instances of GraphQLSchema.
     - https://github.com/npm/npm/issues/7742
     - https://github.com/graphql/graphql-js/issues/594
     - https://github.com/graphql/graphiql/issues/58
    - Solution:
        - http://stackoverflow.com/questions/31169760/how-to-avoid-react-loading-twice-with-webpack-when-developing
