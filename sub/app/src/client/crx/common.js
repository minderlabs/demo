//
// Copyright 2017 Minder Labs.
//

// TODO(burdon): Factor out.
export const Defs = {

  SERVER: {
    // TODO(burdon): dockerhost.net config.
    DEV:  { value: 'http://localhost:3000',             title: 'localhost' },
    PROD: { value: 'https://demo-dev.minderlabs.com',   title: 'https://demo-dev.minderlabs.com' }
  }
};

/**
 * Default settings.
 * NOTE: Must specify value (since keys are used to load values into cache).
 */
export const DefaultSettings = {

  // App server (e.g., dev, prod).
  server: Defs.SERVER.PROD.value,

  // TODO(burdon): Overlay on config: crx: {},
  crx: {

    // Show notification messages.
    notifications: false,

    // Auto-open the sidebar if context changes.
    autoOpen: false,

    // Navigate to web-app.
    openTab: true
  }
};

/**
 * Keys
 * Properties (other than "_KEYS_") should match the keydown event.
 * https://css-tricks.com/snippets/javascript/javascript-keycodes
 * https://developer.mozilla.org/en-US/docs/Web/Events/keydown
 * http://keycode.info
 */
export const KeyCodes = {

  TOGGLE: {
    _KEYS_: ['⌘ Command', '\''],
    metaKey: true,
    keyCode: 222
  }
};

/**
 * Content Script <==> Sidebar commands.
 */
export const SidebarCommand = {

  ERROR:                  'ERROR',                // Notify content script of errors in sidebar.
  INITIALIZED:            'INITIALIZED',          // Notify content script sidebar is initialized.
  SET_VISIBILITY:         'SET_VISIBILITY',       // Request sidebar visibility.
  UPDATE_VISIBILITY:      'UPDATE_VISIBILITY',    // Notify when sidebar visibilty changes.
  UPDATE_CONTEXT:         'UPDATE_CONTEXT'        // Update content script context.
};

/**
 * Sidebar <==> Background Page commands.
 */
export const SystemChannel = {

  CHANNEL:                'system',               // Channel name.

  // From sidebar.
  PING:                   'PING',                 // Testing.
  REGISTER:               'REGISTER',             // Registers the client with the background page.

  // From options.
  AUTHENTICATE:           'AUTHENTICATE',         // Trigger authentication.
  CONNECT:                'CONNECT',              // Trigger client registration.

  // To sidebar.
  RESET:                  'RESET',                // Reset client database (e.g., server changed).
  INVALIDATE:             'INVALIDATE',           // Invalidate queries.
};
