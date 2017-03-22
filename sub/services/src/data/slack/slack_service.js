//
// Copyright 2017 Minder Labs.
//

/**
 * Slack Service.
 */
// TODO(burdon): Service not OAuth provider.
export class SlackServiceProvider { //extends ServiceProvider {

  get providerId() {
    return 'slack';
  }

  get html() {
    return (
      '<a href="/botkit/login">' +
        '<img alt="Add to Slack" height=40 width="139" src="https://platform.slack-edge.com/img/add_to_slack.png">' +
      '</a>'
    );
  }
}
