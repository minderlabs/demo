//
// Copyright 2017 Minder Labs.
//

import ReactGA from 'react-ga';

import { AnalyticsConfig } from '../../common/defs';


const INJECTOR_KEY = 'INJECTOR_KEY_ANALYTICS';

/**
 * Service-agnostic Analytics interface.
 *
 * Most analytics and metrics reporting services support a similar interface, e.g. Mixpanel, Intercom, Firebase
 * Analytics. Provide a generic interface which can be specialized to report to various services.
 *
 */
export class Analytics {

  /**
   * Injector key to inject Analytics subclasses. For example:
   *   Injector.provider(new GoogleAnalytics(), Analytics.INJECTOR_KEY);
   *   ...
   *   let analytics = injector.get(Analytics.INJECTOR_KEY);
   */
  static get INJECTOR_KEY() {
    return INJECTOR_KEY;
  }

  // TODO(madadam): More events.
  // x Login/logout
  // x Page view / navigation events
  // x Search
  // x Mutations (add|edit, type)
  // - Search result clicks
  // - High-level product actions, e.g. Assign a task, complete a task, add search result to card.
  // - UI actions, e.g. drag a card, button clicks.
  // - Clicks on external links (e.g. ReactGA.outboundLink or OutboundLink component).
  // - Exceptions/errors

  constructor(config) {
    this._config = config;
  }

  identify(userId) {
  }

  pageview(location) {
    throw new Error('Not implemented.');
  }

  /**
   * Most services support a similar interface for custom events, Google Analytics seems to be the exception:
   * Segment:           event(name, params) // https://segment.com/docs/sources/website/analytics.js/#track
   * FirebaseAnalytics: event(name, params)  // https://support.google.com/firebase/topic/6317484?hl=en&ref_topic=6386699
   * Mixpanel:          event(name, params)
   * Intercom:          event(name, params) // https://developers.intercom.com/reference#events
   * GoogleAnalytics:   event(category, action, label, numeric_value)
   *
   */
  track(name, params) {
    throw new Error('Not implemented.');
  }

  // TODO(madadam): Add a group() method? for e.g. https://segment.com/docs/sources/website/analytics.js/#group
}

export class SegmentAnalytics extends Analytics {

  constructor(config) {
    super(config);

    // TODO(madadam): will this work in CRX? Might need to use the node library.

    this.analytics = function(){
      // https://segment.com/docs/sources/website/analytics.js/quickstart/
      var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t){var e=document.createElement("script");e.type="text/javascript";e.async=!0;e.src=("https:"===document.location.protocol?"https://":"http://")+"cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};analytics.SNIPPET_VERSION="4.0.0";
      analytics.load(AnalyticsConfig.segmentWriteKey);
      analytics.page();
      return analytics;
    }}();
  }

  identify(userId) {
    this.analytics.identify(userId);
  }

  pageview(location) {
    // https://segment.zendesk.com/hc/en-us/articles/205583515-Chrome-Extensions-event-tracking
    this.analytics.page();
  }

  track(name, params) {
    this.analytics.track(name, params);
  }

}

export class GoogleAnalytics extends Analytics {

  constructor(config) {
    super(config);
    // TODO(madadam): Add a client identifier, e.g. web, crx, mobile -- or does GA handle this?
    // TODO(madadam): Add appVersion, appName, get from config.
    ReactGA.initialize(AnalyticsConfig.googleAnalyticsTrackingId, {titleCase: false});
  }

  identify(userId) {
    ReactGA.set({userId});
  }

  pageview(location) {
    // TODO(madadam): will this work in CRX?
    ReactGA.pageview(location.pathname);
  }

  track(name, params) {
    // Map properties to GA event fields, similar to how Segment does it.
    // https://segment.com/docs/integrations/google-analytics/#track

    let eventArgs = {
      category: params.category || 'All',
      action: params.action || name,
    };
    if (params.label) {
      eventArgs.label = params.label;
    }
    if (params.text && !params.label) {
      // Special-case: map 'text' field to label.
      eventArgs.label = params.text;
    }
    if (params.value) {
      eventArgs.value = params.value;
    }
    ReactGA.event(eventArgs);
  }
}

