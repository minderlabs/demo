//
// Copyright 2016 Minder Labs.
//

/**
 * App-wide constants.
 */
export const Const = {

  PLATFORM: {
    WEB: 'web',
    CRX: 'crx',
    MOBILE: 'mobile'
  },

  DOM_ROOT: 'app-root',

  APP_PATH: '/app',

  APP_NAME: 'minder',

  // NOTE: Changed by grunt:version
  APP_VERSION: "0.1.13",

  // TODO(burdon): Move to minder-core.
  // NOTE: Express lowercases headers.
  HEADER: {

    // Client ID set by server (Web) or on registration (CRX, mobile).
    CLIENT_ID: 'minder-client',

    // Use by Apollo network middleware to track request/response messages.
    REQUEST_ID: 'minder-request'
  }
};

/**
 * Task levels.
 */
export const TASK_LEVELS = {

  UNSTARTED: 0,
  ACTIVE:    1,
  COMPLETE:  2,
  BLOCKED:   3,

  // Enums with properties in javascript: https://stijndewitt.com/2014/01/26/enums-in-javascript
  properties: {
    0: { title: 'Unstarted' },
    1: { title: 'Active'    },
    2: { title: 'Complete'  },
    3: { title: 'Blocked'   }
  }
};
