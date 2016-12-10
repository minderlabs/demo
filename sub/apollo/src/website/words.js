//
// Copyright 2016 Minder Labs.
//

import './words.less';

/**
 * Words animation.
 */
export class Words {

  // http://www.litscape.com/word_tools/contains_sequence.php
  static data() {
    return [
      ['bloody',    'ed'],
      ['broad',     'ed'],
      ['clear',     'ed'],
      ['high',      'ed'],
      ['like',      'ed'],
      ['master',    null],
      ['never',     null],
      [null,        'altering'],
      [null,        'blowing'],
      [null,        'boggling'],
      [null,        'fulness'],
      [null,        'reader'],
      [null,        'scapes'],
      [null,        'set'],
      ['open',      'ed'],
      ['re',        null],
      ['right',     'ed'],
      ['strong',    'ed'],
      ['well',      'ed']
    ];
  }

  // Generator.
  static *words() {
    let i = 0;
    let words = Words.data();
    while (i < words.length) {
      yield [i, words[i++]];
    }
  }

  constructor() {
    this._lhs = $('.site-title > div:first-child');
    this._rhs = $('.site-title > div:last-child');
  }

  start(delay=0, time=-1, delta=1) {
    let words = new Map(Words.words());

    let period = 1000;
    let ts = new Date().getTime() / 1000;

    function timer(period) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve();
        }, period);
      });
    }

    let self = this;
    function update() {
      if (words.size == 0) {
        words = new Map(Words.words());
      }

      let i = Math.floor(Math.random() * words.size);
      let key = Array.from(words.keys())[i];
      let word = words.get(key);
      words.delete(key);

      self.update(word);
    }

    function next(period) {
      let running = true;

      let p = (new Date().getTime() / 1000) - ts;
//    console.log('T:', p, period);

      if (time > 0 && p > time) {
        running = false;
      }

      timer(period).then(function() {
        update();
        period = Math.max(period * delta, 50);

        if (running) {
          next(period);
        } else {
          self.stop();
        }
      });
    }

    setTimeout(function() {
      $('.site-title').addClass('site-running');

      next(period);
    }, delay * 1000);

    return this;
  }

  stop() {
    console.log('Stopping...');
    $('.site-title').removeClass('site-running').addClass('site-bright');
    this.update([null, 'er']);
    return this;
  }

  update(word) {
    // this._lhs.text(word[0] || '');
    // this._rhs.text(word[1] || '');

    if (word[0]) {
      this._lhs.removeClass('site-fade');
      this._lhs.text(word[0]);
    } else {
      this._lhs.addClass('site-fade');
    }

    if (word[1]) {
      this._rhs.removeClass('site-fade');
      this._rhs.text(word[1]);
    } else {
      this._rhs.addClass('site-fade');
    }
  }
}
