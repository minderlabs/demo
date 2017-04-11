# Apollo

![Apollo](https://github.com/minderlabs/demo/blob/master/docs/kbase/apollo.png "Apollo")


## Ref

- https://apollographql.slack.com
- http://dev.apollodata.com/react/higher-order-components.html
- http://dev.apollodata.com/core/apollo-client-api.html#apollo-client


## Call Sequence.

TODO(burdon): When is redux callback triggered (all called on each action?)
TODO(burdon): When are queries triggered?
TODO(burdon): When is reduce triggered (any mutation?)
TODO(burdon): When is render triggered?

Ths top-level component is naive (doesn't know about Redux or Apollo).

~~~~
    class Foo extends React.Component {

        static propTypes {

            // Provided by graphql below:
            data: PropTypes.shape({
                items: PropTypes.array
            })
        }

        // NOTE: Called after Redux below.
        static defaultProps {}

        // NOTE: Update state here since component will be re-used by HOC.
        componentWillReceiveProps(nextProps) {
            this.state = { ... };
        }
        
        // Called after graphql.props
        render() {
            let { items } = props.data;
        }
    }
~~~~

The Higher Order Component (HOC) add properties, dispatchers and configures queryies:

https://github.com/minderlabs/demo/docs/kbase/apollo_sequence.png

1). Redux.connect(mapStateToProps(state)) => component.props
2). => graphql.options(props) => query {variables}
3). => graphql.props(oldProps, data) =>

1). Redux connect(mapStateToProps(state)) maps the app state to the components props.
2). Apollo graphql(options(props)) maps component props to query variables.
3). Apollo graphql(props(oldProps, data)) replaces the component's data property with custom
    properties (e.g., adding dispatcher).
    
Component properties come from:
- Calling container (e.g., <Foo bar={ 100 }/>)
- Redux mapStateToProps and mapStateToDispatch.
- graphQL.props for query and mutation declarations (i.e., query data).

GraphQL queries are called twice:
- First when the query is loading (data.loading == true or data.error)
  - Components should use data.loading to inspect the state.
- Second when the query results arrive.


# Queries

The graphql connector `graphql(Query, options)` passes options to the `watchQuery` API.

- http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.watchQuery

# Example

~~~~
    /**
     * Map Redux state onto component properties.
     * Called whenever the state is updated via a reducer.
     * The component is rerendered if DIRECT objects that are accessed are updated.
     *
     * http://stackoverflow.com/questions/36815210/react-rerender-in-redux
     * http://redux.js.org/docs/FAQ.html#react-rendering-too-often
     * https://github.com/markerikson/redux-ecosystem-links/blob/master/devtools.md#component-update-monitoring
     */

    // Map Redux state to properties.
    mapStateToProps = (state, ownProps) => {}

    // Create function bindings to dispatch Redux actions.
    mapStateToDispatch = (dispatch, ownProps) => {

        // Invoke Redux action.
        foo: (value) => { dispatch({ type: 'FOO', value }); }
        
        // Invoke Redux Router action.
        nav: (id) => { dispatch(push('/path/' + id)); }
    }

    // GraphQL query.
    const Query = gql`
        query Query($foo: String) {
            items(foo: $foo) { ... }
        }
    `;
    
    // GraphQL mutation.
    const Mutation = gql`
        mutation Mutation($foo: String) {
            upsertItems(foo: $foo) { ... }
        }
    `;

    /**
     * Connect creates the Redux Higher Order Object.
     * NOTE: This keeps the Component dry (it defines the properties that it needs).
     *
     * http://redux.js.org/docs/basics/UsageWithReact.html
     * http://redux.js.org/docs/basics/ExampleTodoList.html
     */
    export default compose(
    
        // Redux callbacks.
        connect(mapStateToProps, mapStateToDispatch),
        
        // Apollo query callbacks.
        graphql(Query, {

            // Map component properties to query variables (and handle response).
            // http://dev.apollodata.com/react/queries.html#graphql-options
            options: (props) => ({

                variables: {},
                
                // Manually update cache after mutation action.
                reducer: (previousResult, action) => {
                    if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === 'Mutation') {
                        // Compute new result based on mutation.
                    }
                
                    return previousResult;
                }
            })
            
            // Map query results to properties (and provide data functions).
            // http://dev.apollodata.com/react/queries.html#graphql-props
            props: ({ ownProps, data }) => ({            
                // Vars returned by the query.
                // Best practice to map these onto props required by dumb component.
                data,
                
                refetch: () => {
                    data.refectch({ ... });
                }
                
                fetchMore: () => {
                    return data.fetchMore({ 
                        variables: { ... } 
                        
                        updateQuery: (previousResult, { fetchMoreResult }) => {
                            return update(previousResult, { $push: fetchMoreResult.items })
                        }
                    });
                }
            })
        }),

        // Apollo mutation callbacks.
        graphql(Mutation, {
        
            // http://dev.apollodata.com/react/mutations.html
            props: ({ ownProps, mutate }) => ({
            
                // http://dev.apollodata.com/react/mutations.html#optimistic-ui
                optimisticResponse: {
                    __typename: 'Mutation',
                    ...
                },
                
                // Called after optimisticResponse and response from server.
                // NOTE: reducer above is more flexible (and focued on the query).
                // http://dev.apollodata.com/react/cache-updates.html#updateQueries
                updateQueries: {
                    Mutation: (previousResults, { mutationResult }) => {
                        // Compute new result based on mutation.
                        return previousResult;
                    }
                }
            })
        })
    )
~~~~


# Issues
- Passing vars to fragment not supported:
    - // https://github.com/apollostack/react-apollo/issues/262



# Troubleshooting

- QueryManager.js?2cbe:150 Error in observer.error 
- Error: Network error: Store error: the application attempted to write an object with no provided id but the store already contains an id of Project/demo for this object.
    - Make sure id is being queried for nested items.
    - https://github.com/apollostack/react-apollo/issues/385
    
