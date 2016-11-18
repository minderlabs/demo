//
// Copyright 2016 Minder Labs.
//

'use strict';

import { ID, TypeUtil } from 'minder-core';

// Sanity test.

console.log(TypeUtil.JSON({ test: ID.createId('Test') }));
