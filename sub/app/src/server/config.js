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
  'auth'      : Logger.Level.debug,
  'client'    : Logger.Level.debug,
  'net'       : Logger.Level.debug,
  'resolver'  : Logger.Level.debug,
  'gql'       : Logger.Level.debug,
  'db'        : Logger.Level.info,

}, Logger.Level.warn);
