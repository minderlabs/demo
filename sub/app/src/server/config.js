//
// Copyright 2016 Minder Labs.
//

import { Logger } from 'minder-core';

//
// Config must come before module imports that create Logger instances.
//

Logger.setLevel({

  'server'    : Logger.Level.debug,
  'auth'      : Logger.Level.debug,
  'client'    : Logger.Level.debug,
  'net'       : Logger.Level.debug,
  'resolver'  : Logger.Level.debug,
  'system'    : Logger.Level.debug,
  'gql'       : Logger.Level.debug,
  'db'        : Logger.Level.info,

}, Logger.Level.warn);
