//
// Copyright 2016 Minder Labs.
//

//
// Config must come before module imports that create Logger instances.
//

Logger.setLevel({

  'main':       Logger.Level.info,
  'net':        Logger.Level.info,
//'reducer':    Logger.Level.debug,
  'reg':        Logger.Level.debug

}, Logger.Level.error);
