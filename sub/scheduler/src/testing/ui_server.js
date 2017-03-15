//
// Copyright 2017 Minder Labs.
//

import kue from 'kue';
import express from 'express';
import ui from 'kue-ui';

let app = express();

// JSON API.
app.use('/kue/api', kue.app);

// NOTE: Don't use!
// - Quite buggy (but better dashboard).
// - Fails if REDIS stops.
ui.setup({

  // Polls the existing API.
  apiURL: '/kue/api',

  baseURL: '/kue/ux',

  // TODO(burdon): Display doesn't update (only counts in sidebar).
  // https://github.com/stonecircle/kue-ui/issues/36
  updateInterval: 5000
});

app.use('/kue/ux', ui.app);

app.listen(3000);
