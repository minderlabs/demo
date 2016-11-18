#
# Copyright 2016 Minder Labs.
#

import operator

from collections import defaultdict

from server.data.database import Database


class MemoryDatabase(Database):

    # TODO(burdon): Factor out utils.

    @staticmethod
    def update_item_values(item, **kwargs):
        for key, value in kwargs.iteritems():
            MemoryDatabase.maybe_update_item_value(item, key, value)
        return item

    @staticmethod
    def maybe_update_item_value(item, key, value):
        if value is not None:
            item[key] = value
        return item

    def __init__(self):

        # Map of User JSON objects.
        self._users = dict()

        # Map of Item JSON objects.
        self._items = dict()

        # Map of sets of item IDs.
        self._items_by_user = defaultdict(set)

    def load(self):
        # TODO(burdon): Load from JSON file.
        print 'LOADING'

        user = self.create_user(user_id=Database.DEFAULT_USER, title='Test User')

        self.create_item(user['id'], title='Item 1')
        self.create_item(user['id'], title='Item 2')
        self.create_item(user['id'], title='Item 3')
        self.create_item(user['id'], title='Item 4', status=1)
        self.create_item(user['id'], title='Item 5')

        return self

    #
    # Users
    #

    def create_user(self, user_id, **kwargs):
        user = {
            'id': user_id,
        }
        for key, value in kwargs.iteritems():
            user[key] = value
        self._users[user_id] = user
        return user

    def get_user(self, user_id):
        return self._users.get(user_id)

    #
    # Items
    #

    def create_item(self, user_id, **kwargs):
        item_id = Database.create_id()
        item = {
            'id': item_id
        }
        MemoryDatabase.update_item_values(item, **kwargs)
        self._items[item_id] = item
        self._items_by_user[user_id].add(item_id)
        return item

    def update_item(self, user_id, item_id, **kwargs):
        print [key for key, item in self._items.iteritems()]
        item = self.get_item(item_id)
        MemoryDatabase.update_item_values(item, **kwargs)
        return item

    def get_item(self, item_id):
        return self._items.get(item_id)

    def get_items_for_user(self, user_id):
        items = [self.get_item(item_id) for item_id in self._items_by_user[user_id]]
        return sorted(items, key=operator.itemgetter('title'))
