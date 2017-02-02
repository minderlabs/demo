//
// Copyright 2016 Minder Labs.
//

import React from 'react';

/**
 * Custom list column.
 */
export const DocumentColumn = (props, context) => {
  return (
    <div className="ux-font-xsmall ux-link">
      <a target="MINDER_OPEN" href={ props.item.url }>
        { props.item.source }
      </a>
    </div>
  );
};
