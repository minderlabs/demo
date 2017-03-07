/
// Copyright 2017 Minder Labs.
//

import ReactGA from 'react-ga';

import { GoogleAnalyticsConfig } from '../../common/defs';

class AnalyticsBase {

  // TODO(madadam):
  // - page view / navigation events
  // - mutations (but not the data, right?)
  // - login/logout
  // - search
  // - clicks on external links
  // - Exceptions/errors

  identify(userId) {
    throw new Error('Not implemented.');
  }

  pageview(location) {
    throw new Error('Not implemented.');
  }

  track(name, properties) {
    throw new Error('Not implemented.');
  }
}

export class GoogleAnalytics extends AnalyticsBase {
  constructor(config) {
    // TODO(madadam): Add a client identifier, e.g. web, crx, mobile.
    ReactGA.initialize(GoogleAnalyticsConfig.trackingId, {titleCase: false});
  }

  identify(userId) {
    ReactGA.set({userId});
  }

  pageview(location) {
    ReactGA.pageview(location.pathname);
  }

  track(name, properties) {
    // FIXME map properties to GA event fields.
    ReactGA.event(name, action);
  }
}

