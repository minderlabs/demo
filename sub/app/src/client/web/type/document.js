//
// Copyright 2016 Minder Labs.
//

import React from 'react';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Custom list column.
 */
export const DocumentColumn = (props, context) => {
  return (
    <a target="MINDER_OPEN" className="ux-center-row" href={ props.item.url }>
      <i className="ux-icon">open_in_new</i>
    </a>
  );
};
