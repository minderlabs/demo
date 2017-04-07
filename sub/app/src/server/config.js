//
// Copyright 2016 Minder Labs.
//

import { Logger } from 'minder-core';

//
// Config must come before module imports that create Logger instances.
//

Logger.setLevel({

  'botkit'    : Logger.Level.debug,
  'client'    : Logger.Level.debug,
  'db'        : Logger.Level.info,
  'gql'       : Logger.Level.debug,
  'net'       : Logger.Level.debug,
  'oauth'     : Logger.Level.debug,
  'resolver'  : Logger.Level.debug,
  'server'    : Logger.Level.debug,
  'system'    : Logger.Level.debug,
  'user'      : Logger.Level.debug,

  'loader'      : Logger.Level.debug,

}, Logger.Level.info);
