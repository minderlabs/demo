#
# Copyright 2016 Alien Laboratories, Inc.
#

from unittest import TestCase

from easydict import EasyDict

from schema import schema


class TestSchema(TestCase):

    def test_schema(self):

        # TODO(burdon): Why something?
        query = '''
            query {
              user {
                id
                title
              }
            }
        '''

        result = schema.execute(query)
        if result.errors:
            print result.errors
            self.fail()

        user = EasyDict(result.data['user'])

        self.assertEqual('U-1', user.id)
        self.assertEqual('Test User', user.title)
