//
// Copyright 2017 Minder Labs.
//

import React from 'react';

/**
 * React utils.
 */
export class ReactUtil {

  /**
   * React.Component render wrapper.
   * Returns empty <div> if loading; wraps errors.
   *
   * @param cls
   * @param render
   * @param showLoading
   * @return {Element}
   */
  static render(cls, render, showLoading=true) {
    let { loading, error } = cls.props;

    if (loading) {
      if (showLoading) {
        return (
          <div className="ux-loading"><div><span/></div></div>
        );
      } else {
        return <div/>;
      }
    } else if (error) {
      console.error(error);
      return (
        <div className="ux-error">{ String(error) }</div>
      );
    } else {
      try {
        // Ready.
        return render(cls.props, cls.context);
      } catch(error) {
        // TODO(burdon): Log if prod and show standard error.
        let message = error.message || 'Error rendering.';
        console.error(message);
        return (
          <div className="ux-error">{ message }</div>
        );
      }
    }
  }
}
