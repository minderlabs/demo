#!/bin/sh

pushd sub/core    && karma start --single-run && popd
pushd sub/graphql && karma start --single-run && popd
