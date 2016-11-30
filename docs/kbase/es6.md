# ES6

## Async

Babel:

- https://babeljs.io/docs/plugins/transform-async-to-generator

~~~~
    "plugins": [
        "transform-async-to-generator"
    ]
~~~~

~~~~
    async function() {
        setTimeout(() => {
            await foo();
        });
    }
~~~~
