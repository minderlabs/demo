# Chrome Extensions

## Tools

- Reloader (set options to reload page).
    - NOTE: Must reload from Tools/Extensions if manifest changes.
    - https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid

- Chrome App Toolbox
    - https://chrome.google.com/webstore/detail/chrome-apps-extensions-de/ohmmkhmmmpcnpikjeljgnaoabkaalbgc


## Development

- Rebuild webpack files for development (i.e., not "in-memory" dev_server)

~~~~
    webpack --watch
    grunt watch
~~~~


### Content Scripts

- https://developer.chrome.com/extensions/content_scripts

- Seprate execution environment (e.g., cannot access console.log)
    - http://stackoverflow.com/questions/3829150/google-chrome-extension-console-log-from-background-page


### Event Pages

- Use instead of Background Pages
- Logs to background pages


## Admin

- Clear DNS Cache: chrome://net-internals/#dns


## Developer Tools

- OPT ⌘ I           Open tools
- ⌘P                File tree.


## CRX

- Publishing
    - https://developer.chrome.com/webstore/publish#set-up-group-publishing
    - Enable Google Groups for Domain (select Apps: https://admin.google.com)
    - Create Google Group for publishing: https://groups.google.com and add users.
    - Log-in to dashboard: https://chrome.google.com/webstore/developer/dashboard
    - Select Group
    - NOTE: May take some time (docs say 30 mins) for devs in Group to see changes. 
