# Relay


## Refs

- https://facebook.github.io/relay



## Connections

- Custom args:
- https://facebook.github.io/relay/graphql/connections.htm#sec-Edge-Types
- https://github.com/facebook/relay/issues/59

~~~~
    // items(first: 10, type: "Task")
    items: {
      type: ItemConnection,
      args: {
        ... connectionArgs,

        type: {
          type: GraphQLString
        }
      }
    },
~~~~


## Fragments

TODO(burdon): @include(if: $var) syntax
- https://facebook.github.io/relay/docs/api-reference-relay-ql.html#conditional-fields

~~~~
  initialVariables: {
    showComments: false,
  },

  fragments: {
    story: (variables) => Relay.QL`
      fragment on Story {
        comments(first: $numCommentsToShow) @include(if: $showComments) {
          edges {
            node {
              author { name },
              id,
              text,
            },
          },
        },
      }
    `,
~~~~




TODO(burdon): Caching
- https://github.com/facebook/relay/wiki/Frequently-Asked-Questions
- https://github.com/facebook/relay/issues/720#issuecomment-174050321
- https://facebook.github.io/relay/docs/thinking-in-graphql.html#content

TODO(burdon): Events and subscriptions.