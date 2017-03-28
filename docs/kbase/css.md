# CSS

## Rules

- Framework classes prefixed by "nx-".

- Use "display:flex" for ALL layout.

- Do not use "style" attributes except for React template visibility logic.

- Class styles:
    - order declarations in importance (and group related rules):
        - display, position, layout, etc.
        - padding/margin
        - overflow
        - fonts/colors

- define generic "nx-" styles as mixins.

- scope inner component classes (otherwise they might leak).

~~~~
    <div class="nx-card">
      <div class="nx-card-header"/>
        ...
      </div>
    </div>
~~~~


### General

- https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing

~~~~
    border-box: border-box;                         /* Includes padding and borders. */

    body { overflow: hidden; }                      /* Prevent scrolling bounce. */

    input, textarea, button { outline: none; }      /* Remove blue Mac focus border. */
    
    .noselect { -webkit-user-select: none; }        /* Prevent selection. */
~~~~


### Selectors

~~~~
    input[type=text]
    .name > div                                     /* Div immediately after named class. */
~~~~

- tilde: http://stackoverflow.com/questions/10782054/what-does-the-tilde-squiggle-twiddle-css-selector-mean


### Position

- no padding or margins in container.

~~~~
    .container { position: absolute; left: 0; right: 0; top: 0; height: 100px; }
~~~~


### Layout

- https://css-tricks.com/snippets/css/a-guide-to-flexbox

~~~~
    .container {
      display: flex;
      flex-grow: 1;
      flex-direction: row;
      overflow: hidden;                             // Necessary to avoid pushing children offscreen if minimal space.
    }
~~~~


### Elements

~~~~
    .container { font-size: 0; }                    /* Remove space between items. */
    .container .item { display: inline-block; }

    padding: <side> <top-bottom>;
~~~~
    
    
### Tables

- no padding or margins in cells.

~~~~
    table {
      border-collapse: collapse;                    /* No padding. */
      table-layout: fixed;                          /* Don't resize for content. */
      width: 100%;
    }
~~~~
    
    
### Text

~~~~
    .overflow {
      overflow: hidden;                             /* Must have fixed size or absolute container. */
      white-space: nowrap;
      text-overflow: ellipsis;
    }
~~~~

    
## Chrome Extensions

~~~~
    chrome-extension://<extensionID>/<pathToFile>
~~~~


## Resources

- https://css-tricks.com/almanac
- https://developer.mozilla.org/en-US/docs/Web/CSS

- Google Material
    - https://www.google.com/design/spec/material-design/introduction.html
    - https://www.google.com/design/icons
    - https://github.com/google/material-design-lite

