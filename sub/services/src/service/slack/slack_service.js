//
// Copyright 2017 Minder Labs.
//

import { ServiceProvider } from '../service';

/**
 * Slack Service.
 */
export class SlackServiceProvider extends ServiceProvider {

  constructor() {
    super('slack');
  }

  get title() {
    return 'Slack';
  }

  get icon() {
    return '/img/service/slack.png';
  }

  get link() {
    return '/botkit/login'
  }
}
