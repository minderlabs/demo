//
// Copyright 2017 Minder Labs.
//

import { Const } from '../../common/defs';

import { AppAction, AppReducer, ContextAction, ContextReducer } from '../common/reducers';
import { WebApp } from '../web/app';

import { SidebarAction, SidebarReducer } from './sidebar/reducers';
import { Application } from './sidebar/app';

/**
 * Test sidebar app (enable testing within DOM).
 */
class TestSidebarApp extends WebApp {

  get reducers() {
    return {
      // Main app.
      [AppAction.namespace]: AppReducer(this._injector, this._config),

      // Context.
      [ContextAction.namespace]: ContextReducer,

      // Sidebar-specific.
      [SidebarAction.namespace]: SidebarReducer
    }
  }
}

//
// Test config.
//

const config = _.assign(window.config, {
  debug: true,
  app: {
    platform: Const.PLATFORM.CRX
  }
});

const app = new TestSidebarApp(config);

module.hot.accept('./sidebar/app', () => {
  const App = require('./sidebar/app').default;
  app.render(App);
});

app.init().then(() => {
  app.render(Application).then(root => {

    //
    // Testing.
    //

    window.ITEMS = {
      t1: { type: 'Contact', title: 'Alice',      email: 'alice.braintree@gmail.com'  },
      t2: { type: 'Contact', title: 'Bob',        email: 'bob@example.com'            },
      t3: { type: 'Contact', title: 'Catherine',  email: 'catherine@example.com'      },
      t4: { type: 'Contact', title: 'David',      email: 'david@example.com'          },
      t5: { type: 'Contact', title: 'Emiko',      email: 'emiko@example.com'          },
      t6: { title: 'slack_channel 1', context: [{ key: 'slack_channel',     value: { string: 'C4BPPS9RC' }}]    },
    };

    let select = $('<select>').appendTo(root)
      .append($('<option>').text('<null context>'))
      .css('position', 'absolute')
      .css('bottom', 0)
      .change(event => {
        let item = window.ITEMS[$(event.target).val()];
        let context = null;
        if (item && item.context) {
          context = { context: item.context };
        } else if (item) {
          context = { items: [item] };
        }
        let action = {
          type: 'MINDER_CONTEXT/UPDATE',
          context: context
        };

        window.minder.store.dispatch(action);
        console.log(`window.minder.store.dispatch(${JSON.stringify(action)})`);
      });

    _.each(window.ITEMS, (value, key) => {
      $('<option>').appendTo(select).attr('value', key).text(value.title);
    });
  });
});
