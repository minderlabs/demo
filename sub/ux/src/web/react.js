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
  static render(cls, render, showLoading = true) {
    let { loading, error } = cls.props;

    if (loading) {
      if (showLoading) {
        return (
          <div className="ux-loading">
            <div><span/></div>
          </div>
        );
      } else {
        return <div/>;
      }
    } else if (error) {
      // NOTE: NetworkLogger logs to the console.
      return (
        <div className="ux-error">{ String(error) }</div>
      );
    } else {
      try {
        // Ready.
        return render(cls.props, cls.context);
      } catch (error) {
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

/**
 * Redux and Apollo provide a withRef option to enable access to the contained component.
 * This cascades down through the connect() chain, so depending on how deeply nested the components are,
 * getWrappedInstance() needs to be called multiple times.
 *
 * @param container Higher-Order Component (Redux container).
 */
export function getWrappedInstance(container) {

  // https://github.com/apollostack/react-apollo/issues/118
  // http://dev.apollodata.com/react/higher-order-components.html#with-ref
  // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
  while (container.getWrappedInstance) {
    container = container.getWrappedInstance();
  }

  return container;
}
