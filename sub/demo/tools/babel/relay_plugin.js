//
// Referenced by .babelrc
// https://facebook.github.io/relay/docs/guides-babel-plugin.html#content
//

const getbabelRelayPlugin = require('babel-relay-plugin');

const SCHEMA = '../../dist/schema.json';

try {
  const schema = require(SCHEMA);
  module.exports = getbabelRelayPlugin(schema.data);
} catch (ex) {
  // File doesn't exist until first run.
  console.log('WARNING: Missing schema file: ' + SCHEMA);
}
