//
// Copyright 2016 Minder Labs.
//

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
