//
// Copyright 2016 Alien Laboratories, Inc.
//

/**
 * Manage bots, one per team.
 */
export class BotManager {

  constructor(userStateManager) {
    this.userStateManager = userStateManager;

    // Cache the bots (and their RTM connections etc), keyed by bot token.
    this._bots = {};

    // TODO(madadam): Unclear if we still need this. Is there any non-user-specific team state to be kept?
    this._teamUserState = {};
  }

  /**
   * Start handling controller signals for bot creation and startup.
   * @param controller
   */
  init(controller) {
    let self = this;
    controller.on('create_bot', function(bot, config) {
      self.connect(bot, function() {

        bot.startPrivateConversation({ user: config.createdBy }, function(err, convo) {
          if (err) {
            console.log(err);
          } else {
            convo.say('I am a bot that has just joined your team');
            convo.say('You must now /invite me to a channel so that I can do useful stuff!');
          }
        });
      });
    });

    // Reconnect all teams on startup.
    controller.storage.teams.all(function(err, teams) {
      if (err) {
        throw new Error(err);
      }

      for (let team of teams) {
        if (team.bot) {
          let bot = controller.spawn(team);
          self.connect(bot, function() {
            self.userStateManager.loadUsers(bot);
          });
        }
      }
    });
  }

  connect(bot, onConnected=null) {
    if (this._bots[bot.config.token]) {
      console.log('Bot already registered for token: ' + bot.config.token);
    } else {
      let self = this;
      let user = bot.config.createdBy;

      this.userStateManager.getUserState(user, bot)

        .then(function(userState) {
          self._teamUserState[bot.config.token] = userState;

          bot.startRTM(function(err) {
            if (!err) {
              self._track(bot);
            } else {
              console.log('Error connecting bot to Slack:', err);
            }
            if (onConnected) {
              onConnected();
            }
          });
        })

        .catch(function(err) {
          console.log('** ERROR getting user state for ' + user + ': ' + err);
        });
    }
  }

  getBot(token) {
    return this._bots[token];
  }

  _track(bot) {
    console.log('Connecting team: ' + JSON.stringify(bot.config));
    this._bots[bot.config.token] = bot;
  }
}
