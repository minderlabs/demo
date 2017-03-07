//
// Copyright 2016 Minder Labs.
//

//
// Config must come before module imports that create Logger instances.
//

Logger.setLevel({

  'main':       Logger.Level.info,
  'net':        Logger.Level.info,
  'auth':       Logger.Level.debug,
  'client':     Logger.Level.debug,
  'gcm':        Logger.Level.debug

}, Logger.Level.info);
