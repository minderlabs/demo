//
// Copyright 2017 Minder Labs.
//

import { ServiceProvider } from '../service';

/**
 * Slack Service.
 */
export class SlackServiceProvider extends ServiceProvider {

  constructor() {
    super('slack', 'Slack');
  }

  get link() {
    return '/botkit/login'
  }

  get icon() {
    return '/img/service/slack.png';
  }
}
