#
# Copyright 2016 Minder Labs.
#

import uuid

from abc import abstractmethod


class Database(object):
    """
    Database base class.
    NOTE: Database does not depend on Schema.
    """

    DEFAULT_USER = 'tester'

    @staticmethod
    def create_id():
        return str(uuid.uuid1())

    @abstractmethod
    def load(self):
        raise NotImplementedError()

    #
    # Users
    #

    @abstractmethod
    def create_user(self, **kwargs):
        raise NotImplementedError()

    @abstractmethod
    def get_user(self, user_id):
        raise NotImplementedError()

    #
    # Items
    #

    @abstractmethod
    def create_item(self, user_id, **kwargs):
        raise NotImplementedError()

    @abstractmethod
    def update_item(self, user_id, item_id, **kwargs):
        raise NotImplementedError()

    @abstractmethod
    def get_item(self, item_id):
        raise NotImplementedError()

    @abstractmethod
    def get_items_for_user(self, user_id):
        raise NotImplementedError()
