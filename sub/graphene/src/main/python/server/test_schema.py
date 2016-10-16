#
# Copyright 2016 Alien Laboratories, Inc.
#

from unittest import TestCase

from schema import schema


class TestSchema(TestCase):

    def test_schema(self):
        result = schema.execute('{ hello }')
        self.assertEqual('World', result.data['hello'])
