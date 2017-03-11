//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({}, Logger.Level.info);

import { HttpUtil, KeyListener } from 'minder-core';

import { Const } from '../../common/defs';

import { KeyCodes } from './common';
import { SidebarAction } from './sidebar/reducers';
import { Application, SidebarApp } from './sidebar/app';

// TODO(burdon): Catch errors (notify content script).

//
// Config passed from content script container.
//
const config = _.merge({
  root: Const.DOM_ROOT,

  // TODO(burdon): Build option (based on CRX ID?)
  env: 'development',

  app: {
    platform: Const.PLATFORM.CRX,
    name: Const.APP_NAME
  }

}, HttpUtil.parseUrlArgs());

//
// Root application.
//
const bootstrap = new SidebarApp(config);

bootstrap.init().then(() => {

  bootstrap.render(Application);

  // TODO(burdon): Dynamically set on scroll container (on mouseover?)
  // https://www.npmjs.com/package/prevent-parent-scroll
  /*
  let preventParentScroll = new PreventParentScoll(root);
  preventParentScroll.start();
  */

  new KeyListener()
    .listen(KeyCodes.TOGGLE, () => bootstrap.store.dispatch(SidebarAction.toggleVisibility()));
});