//
// Copyright 2016 Minder Labs.
//

import { ID, TypeUtil } from 'minder-core';

//
// Sanity test.
// Webpack module to test minimal dependencies (able to be served).
//

console.log(TypeUtil.stringify({ test: ID.createId('Test') }));
