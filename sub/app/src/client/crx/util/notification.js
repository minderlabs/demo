//
// Copyright 2016 Alien Laboratories, Inc.
//

/**
 * Chrome App notification.
 */
export class Notification {

  constructor() {
    this._notificationId = null;
  }

  /**
   * Display the basic notification.
   * @param title
   * @param message
   */
  show(title, message) {
    // https://developer.chrome.com/apps/notifications
    chrome.notifications.create(this._notificationId, {
      type: 'basic',
      iconUrl: 'img/icon_128.png',
      title: title,
      message: message || ''
    }, (notificationId) => {
      this._notificationId = notificationId;
    });
  }
}
