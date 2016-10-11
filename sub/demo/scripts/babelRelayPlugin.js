var getbabelRelayPlugin = require('babel-relay-plugin');
var schema = require('../common/data/schema.json');

module.exports = getbabelRelayPlugin(schema.data);
