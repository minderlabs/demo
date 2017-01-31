//
// Copyright 2016 Minder Labs.
//

import { Logger } from 'minder-core';

//
// Config must come before module imports that create Logger instances.
// TODO(burdon): NOTE: For the server, minder-core modules are already initialized before this is called.
//

Logger.setLevel({

  'main'      : Logger.Level.debug,

  'botkit'    : Logger.Level.debug,
  'db'        : Logger.Level.debug,
  'resolver'  : Logger.Level.debug,
  'gql'       : Logger.Level.debug,

}, Logger.Level.error);
