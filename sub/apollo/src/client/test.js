//
// Copyright 2016 Minder Labs.
//

'use strict';

import { ID, TypeUtil } from 'minder-core';

//
// Sanity test.
// Webpack module to test minimal dependencies (able to be served).
//

console.log(TypeUtil.JSON({ test: ID.createId('Test') }));
