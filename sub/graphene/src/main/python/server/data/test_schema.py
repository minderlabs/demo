#
# Copyright 2016 Alien Laboratories, Inc.
#

from unittest import TestCase
from easydict import EasyDict
from graphql_relay import to_global_id, from_global_id

from schema import g
from server.data.memory_database import MemoryDatabase


class TestSchema(TestCase):

    def setUp(self):
        # TODO(burdon): Injector.
        # TODO(burdon): Pass in JSON (parse JSON).
        g.init(MemoryDatabase().load())

    def test_query_user(self):
        user_id = 'U-1'

        # TODO(burdon): Is the query name relevant?
        # https://github.com/graphql-python/graphene/tree/master/examples/starwars_relay

        # Testing with GraphiQL
        # http://127.0.0.1:8080/graphql?query=query%20User(%24userId%3A%20ID!)%20%7B%0A%20%20user(userId%3A%20%24userId)%20%7B%0A%20%20%20%20id%0A%20%20%20%20title%0A%20%20%7D%0A%7D%0A&operationName=User&variables=%7B%0A%20%20%22userId%22%3A%20%22VXNlcjpVLTE%3D%22%0A%7D
        query = '''
            query User($userId_0: ID!) {
              user(userId: $userId_0) {
                id
                title
              }
            }
        '''

        variables = {
          "userId_0": to_global_id('User', user_id)
        }

        # Execute the query.
        result = g.schema.execute(query, variable_values=variables)
        if result.errors:
            print 'ERROR', result.errors
            self.fail()

        user = EasyDict(result.data['user'])

        self.assertEqual(user_id, from_global_id(user.id)[1])
        self.assertEqual('Test User', user.title)

    def test_query_items(self):
        user_id = 'U-1'

        # TODO(burdon): edges?
        # TODO(burdon): define status.

        query = '''
            query User($userId_0: ID!) {
                user(userId: $userId_0) {
                    id, ...F4
                }
            }
            fragment F0 on Item { id }
            fragment F1 on Item { id, title, status, ...F0 }
            fragment F2 on User {
                id,
                items: items(first: 10) {
                    edges {
                        node { id, ...F1 },
                        cursor
                    },
                    pageInfo { hasNextPage, hasPreviousPage }
                }
            }
            fragment F3 on User { id }
            fragment F4 on User { id, title, ...F2, ...F3 }
        '''

        variables = {
          "userId_0": to_global_id('User', user_id)
        }

        # Execute the query.
        result = g.schema.execute(query, variable_values=variables)
        if result.errors:
            print 'ERROR', result.errors
            self.fail()

        user = EasyDict(result.data['user'])

        self.assertEqual(user_id, from_global_id(user.id)[1])
        self.assertEqual('Test User', user.title)
        self.assertEqual(5, len(user.items.edges))
