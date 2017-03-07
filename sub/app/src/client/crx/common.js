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

  // App server (e.g., dev, prod).
  server: Defs.SERVER.PROD.title,

  // Client registration.
  registration: {}
};

/**
 * Keys
 */
export const KeyToggleSidebar = {

  keyCode: 8,         // DELETE
  metaKey: true
};

/**
 * Content Script <==> Sidebar commands.
 */
export const SidebarCommand = {

  INITIALIZED:        'INITIALIZED',          // Notify content script sidebar is initialized.
  SET_VISIBILITY:     'SET_VISIBILITY',       // Request sidebar visibility.
  UPDATE_VISIBILITY:  'UPDATE_VISIBILITY',    // Notify when sidebar visibilty changes.
  UPDATE_CONTEXT:     'UPDATE_CONTEXT'        // Update content script context.
};

/**
 * Sidebar <==> Background Page commands.
 */
export const BackgroundCommand = {

  CHANNEL:            'system',

  // To Background page.
  // TODO(burdon): Make more verbose (e.g., disambiguate register/reconnect).
  PING:               'PING',
  REGISTER:           'REGISTER',
  RECONNECT:          'RECONNECT',
  SIGNOUT:            'SIGNOUT',

  // To client.
  FLUSH_CACHE:        'FLUSH_CACHE'
};
