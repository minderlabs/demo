//
// Referenced by .babelrc
// https://facebook.github.io/relay/docs/guides-babel-plugin.html#content
//

const getbabelRelayPlugin = require('babel-relay-plugin');

const schema = require('../../javascript/common/data/schema.json');

module.exports = getbabelRelayPlugin(schema.data);
