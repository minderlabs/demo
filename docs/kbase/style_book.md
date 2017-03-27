# Coding Style Guide


## Style

- Follow existing style in files (in general, Google style guide).

    - 2 spaces.
    - full sentence comments.


- lodash and d3 are excellent examples of complex system design made simple.


## Pitfalls and Opinions
  
    
- DRY: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself


- STRICT DAG dependencies: not only between modules (data, util, etc.) but ALSO across directories in the
  same module (e.g., foo => foo/bar, but not the other way around).

    frontend => bot => data => util
  
  
- Factor out early and often: Move anything that isn't COMPLETELY SPECIFIC to the current use case to UTIL 
  and create a test for it. Don't do it later. If you write the same code twice, create a utility function for it.

  
- Inheritance: is nearly always a bad idea except for interfaces and abstract base classes.

    Unless the underlying behavior is completely abstracted by the interface, and the derrived class
    exists purely to implement this behavior, then composition is a better approach.

    Good case for inheritance. Channel is a messaging conduit where there can be multiple implementation
    (Test, HTTP, ChromeMessaging, etc.) In each case the different Conduit implementations
    
    Bad case for inheritance. A base class for an App that includes the basic layout and core state.
    Different app implementations are going to vary massively. They will have entirely different behaviors
    and over time the base class will struggle to support these different use cases and become overly
    complex.
    
    
- Exceptions: should only be used for unexpected errors or system level failtures
  (i.e., not for application-level restuls). Exceptions  should be logged and analyzed to improve the overall
  reliability of the system.
  
  
- Functions: should be short and have a single return point. Decompose functions over 20 lines into sub functions,
  each of which can be independently tested.


- Globals: NEVER EVER use global variables. And minimall use gloabl functions. All of our programming languages
  support OO. Create classes for everything. Create class utilities (i.e., only have static methods) for collections
  of related functions (e.g., ItemProtoUtil).

  
- File system: from the start, organize your module into meaningful subdirectories. Don't mix code and config.
  Create directories for self-contained modules that could reasonable be developed by different people. Or for
  cross cutting components of a larger system (e.g., DB, UI, logic).



## 

- TODO(burdon): Save PyCharm style settings.

- https://google.github.io/styleguide/javascriptguide.xml

- Parameter ordering: from least to most "significant":
  Example: login(service, userId)
  Rationale: "service" could be pushed down to a base class; it's "invariant" across multiple users.
