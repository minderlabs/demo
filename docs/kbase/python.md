# Python

TODO(burdon): Turn this into a book or at least an online site (everything in 5 minutes; cheat sheets; wiki). Part of nexus?


## Tools

- https://pypi.python.org/pypi


## Installing Modules

~~~~
    source tools/python/bin/activate                # IMPORTANT: user local virtualenv
    pip install --upgrade -r requirements.
    pip list
~~~~


## Packaging

### Editable Installs:

- http://python-packaging-user-guide.readthedocs.org/en/latest/distributing/#source-distributions
- https://pip.pypa.io/en/latest/reference/pip_install.html#editable-installs

- To create debug dependencies:
    - Create setup.py in the dependency module.
    - Referernce this directory in the caller's requirements.txt (e.g., -e ./sub/data/src/main/python)

~~~~
    [requirements.txt]
    -e sub/data/src/main/python     # Install "editable mode" package: Dir contains setup.py
~~~~


### Wheels

- ZIP-format archive (.whl); supercedes Eggs.
- https://wheel.readthedocs.org/en/latest
- .egg-info directory is created when the setup.py is referenced (even by -e option).

~~~~
    # Build dist
    python src/main/python/setup.py --help-commands
    python src/main/python/setup.py egg__info --egg-base=build bdist_wheel clean

    # In other project.
    pip install --upgrade dist/NX_Worker-0.0.1-py2-none-any.whl
~~~~


## Testing

~~~~
    nosetests -c node.cfg
~~~~


## Packages

- http://flask.pocoo.org/docs/0.10/api/#api
- http://developers.google.com/protocol-buffers/docs/reference/python-generated
- http://developers.google.com/protocol-buffers/docs/reference/python
- http://arrow.readthedocs.org/en/latest
- http://www.grantjenks.com/docs/sortedcontainers


### Google APIs

- http://github.com/google/google-api-python-client
- http://developers.google.com/api-client-library/python/reference/pydoc
- http://developers.google.com/api-client-library/python/apis
- http://developers.google.com/gmail/api
- http://api-python-client-doc.appspot.com


## Best Practice

- Exceptions:
    - Catch specific exceptions at the level that understands them.
    - Log at this level if the exception is important (i.e., unexpected).
    - Raise module level exceptions up to the top handler (i.e., the blueprint)
    
    - http://eli.thegreenplace.net/2008/08/21/robust-exception-handling


## Frameworks

TODO(burdon): Move to stack notes.

- WSGI (Web Service Gateway Interface)
    - https://wsgi.readthedocs.io/en/latest/what.html
    - Spec for interaction between Web servers and Python applications and frameworks.

- uWSGI
    - https://uwsgi-docs.readthedocs.io/en/latest
    - common API for Web servers, load-balancers, proxies, process managers, monitors, etc.

- werkzeug
    - http://werkzeug.pocoo.org
    - broad range of HTTP utilities that implement WSGI.
    - request/response, debugging, unicode, session, endpoint binding, etc.
    
- Flask
    - http://flask.pocoo.org
    - microframework based on werkzeug (WSGI) and jinja2 (templates).
    - built-in server not suitable for production (doesn't scale; single threaded)

- nginx
    - https://www.nginx.com/resources/wiki
    - high performance Web server and reverse proxy.
    - native support for uWSGI.
        - http://uwsgi-docs.readthedocs.io/en/latest/Nginx.html


## Snippets

~~~~
    # Classes
    class Foo(object):      # http://stackoverflow.com/questions/4015417/python-class-inherits-object
        @staticmethod
        foo():
            pass
    
    # https://docs.python.org/2/tutorial/classes.html#private-variables-and-class-local-references
    _foo    # Private
    __foo   # Class-specific (mangled to prevent clash with subclasses)
    
    # Attributes
    getattr(obj, 'foo')
    setattr(obj, 'foo', 100)
    
    def __getitem__(self, index, default=None):

    # Inheritance
    class B(A):
        def __init__(self, arg):
            super(B, self).__init__(arg)

        def foo(self, arg):
            return super(B, self).foo(arg)

    # Collections
    [] == list()      .append()
    {} == dict()      .set()      .get()
    () == set()       .add()

    # Arrays (lists)
    a = [1] + [3, 4, 5]   # Merge
    a.append(6)           # Append
    a[1:2]                # Slice
    a[:]                  # Copy array

    # Maps
    a = {}
    a.keys()
    for key in a:
    for key, value in a.iteritems():

    # Data structures
    collections.defaultdict(list)       # Multimap   
    {}.setdefault('x', []).append(1)
    dd = lambda: defaultdict(dd)        # Map of maps

    # Regular expressions
    import re
    m = re.match(r'.*no.?reply.*@.*', value)
    if m:
      v = m.group(n)

    # Functions
    hasattr(obj, '__call__')
    
    type(obj) == int|str

    set(tuple([1, 2, 3]))               # Since list is mutable.
    set((1, 2)) | set((3, 4))           # Union (& for intersection).

    # Comprehensions
    [message.id for message in messges]
    [{'id': i, 'title': 'Item-%d' % i} for i in xrange(n)]

    # Join multiple generators into single list.
    list(itertools.chain.from_iterable([transformation(x) for x in list_of_arrays]))
    dict((k, value) for k in [op(k, key) for key in keys])
    [v for v in [1, 2, None, 3] if v is not None]
    
    # Merge map of arrays
    sorted({x for v in content.itervalues() for x in v})
    # Merge map of maps
    {k: v for d in supermap.values() for k, v in d.iteritems()}
    
    # Built-ins
    match = filter(lambda x: x in [1, 2, 3], [3, 4, 5])     # Intersection

    # Sorting
    sorted([{'x':3}, {'x':1}, {'x':2}], key=operator.itemgetter('x'))  # also attrgetter for class member
    sorted({'a':{'x':3}, 'b':{'x':1}, 'c':{'x':2}}.values(), key=operator.itemgetter('x'), reverse=True)

    # Match item by attribute
    next(obj for obj in objs if obj.val==5)
    next((obj for obj in objs if obj.val==5), None)

    # Functions
    lambda x: x
~~~~


## Injection

- http://pythonhosted.org/injector

~~~~
    MAP_KEY = MappingKey('x')
    SEQ_KEY = SequenceKey('y')
    
    binder.multibind(MAP_KEY, {'ID': ClassInstance()})
    binder.multibind(SEQ_KEY, {'ID': ClassProviderList([ClassName])})
~~~~

- Cyclic dependencies (use: AssistedBuilder)
    - https://github.com/google/guice/wiki/CyclicDependencies#break-the-cycle-with-a-provider
    - https://pypi.python.org/pypi/injector


## Mocks

- https://docs.python.org/3/library/unittest.mock.html

~~~~
    mock = Mock()
    
    mock.reset_mock()
    mock.foo(true)
    
    # NOTE: No error if the method does not exist (e.g., was renamed).
    mock.foo.assert_called_once_with(true)
~~~~


## Style

- Use single quotes.
- Sort imports (and group).


## Decorators

- http://jfine-python-classes.readthedocs.org/en/latest/decorators.html
- http://stackoverflow.com/questions/2366713/can-a-python-decorator-of-an-instance-method-access-the-class
- https://github.com/apiguy/flask-classy/blob/master/flask_classy.py


## Concepts

- Threads
    - Thread Local (to access variables across thread)
        - http://flask.pocoo.org/docs/0.10/reqcontext
        - http://werkzeug.pocoo.org/docs/0.11/local

        - flask.g
            - http://flask.pocoo.org/docs/0.11/api/#flask.g
            - http://flask.pocoo.org/docs/0.11/testing/#faking-resources-and-context


## Troubleshooting

- pip failes (check in correct virtualenv)
- Do not set environment variable PYTHONPATH 
    it override local virtualenv and will cause the wronge version of pip modules to be installed
- Every directory must contain __init__.py (important for test discover).
- Directory names cannot have dashes (underscores OK).

~~~~
    # coding=utf-8        (must be on line 1: allows unicode in source files.)
~~~~


## 2 v 3

- https://docs.python.org/3/whatsnew/3.0.html

- 3 breaks everything (esp. iterators).
- Protobuf doesn't support it.

- https://news.ycombinator.com/item?id=2273267
- https://www.reddit.com/r/Python/comments/2y9ora/why_is_the_switch_to_python_3_taking_so_long/
- http://lucumr.pocoo.org/2011/12/7/thoughts-on-python3/

