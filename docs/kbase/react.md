# React

TODO(burdon): Consolidate with framework kbase.

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
