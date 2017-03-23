//
// Copyright 2017 Minder Labs.
//

// TODO(burdon): Factor out.
export const Defs = {

  SERVER: {
    DEV:  { value: 'http://localhost:3000',             title: 'localhost' },
    PROD: { value: 'https://demo-dev.minderlabs.com',   title: 'https://demo-dev.minderlabs.com' }
  }
};

/**
 * Default settings.
 * NOTE: Must specify value (since keys are used to load values into cache).
 */
export const DefaultSettings = {

  // Show notification messages.
  notifications: false,

  // Auto-open the sidebar if context changes.
  autoopen: false,

  // Navigate to web-app.
  webapp: true,

  // App server (e.g., dev, prod).
  server: Defs.SERVER.PROD.title,

  // Client registration.
  registration: {}
};

/**
 * Keys
 * Properties (other than "hint") should match the keydown event.
 */
export const KeyCodes = {

  TOGGLE: {
    // FIXME
    hint: '⌘-\'',
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

  CHANNEL:                'system',

  // From options.
  AUTHENTICATE:           'AUTHENTICATE',
  REGISTER_CLIENT:        'REGISTER_CLIENT',

  // From sidebar.
  PING:                   'PING',
  REQUEST_REGISTRATION:   'REQUEST_REGISTRATION',

  // To sidebar.
  FLUSH_CACHE:            'FLUSH_CACHE',
  INVALIDATE:             'INVALIDATE'
};
