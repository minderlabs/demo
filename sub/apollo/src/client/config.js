//
// Copyright 2016 Minder Labs.
//

//
// Config must come before module imports that create Logger instances.
//

Logger.setLevel({

  'main':       Logger.Level.debug,
  'net':        Logger.Level.debug,
  'mutations':  Logger.Level.debug

}, Logger.Level.error);
