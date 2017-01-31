//
// Copyright 2017 Minder Labs.
//

export const DefaultSettings = {
  server: 'http://localhost:3000'
};

export const KeyToggleSidebar = {
  keyCode: 8,   // DELETE
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

  RESET:              'RESET',
  REGISTER:           'REGISTER',
  PING:               'PING'
};
