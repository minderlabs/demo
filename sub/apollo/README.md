# Apollo


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
