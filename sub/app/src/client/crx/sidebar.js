//
// Copyright 2017 Minder Labs.
//

Logger.setLevel({}, Logger.Level.debug);

import { HttpUtil, KeyListener } from 'minder-core';

import { Const } from '../../common/defs';

import { BackgroundCommand, KeyCodes } from './common';

import { SidebarAction } from './sidebar/reducers';
import { Application, SidebarApp } from './sidebar/app';

//
// Config passed via args from content script container.
//

const config = _.merge({
  root: Const.DOM_ROOT,

  // TODO(burdon): Build option (based on CRX ID?)
  env: 'development',

  app: {
    platform: Const.PLATFORM.CRX,
    name: Const.APP_NAME
  }
}, HttpUtil.parseUrlParams());

const app = new SidebarApp(config);

app.init().then(() => {
  app.render(Application);

  // TODO(burdon): Dynamically set on scroll container (on mouseover?)
  // https://www.npmjs.com/package/prevent-parent-scroll
  /*
  let preventParentScroll = new PreventParentScoll(root);
  preventParentScroll.start();
  */

  new KeyListener()
    .listen(KeyCodes.TOGGLE, () => app.store.dispatch(SidebarAction.toggleVisibility()));
});
