#
# Copyright 2016 Alien Laboratories, Inc.
#

import graphene
from graphene import relay, resolve_only_args
from graphql_relay import from_global_id

#
# http://docs.graphene-python.org/en/latest/quickstart
# https://facebook.github.io/graphql
#


class Item(graphene.ObjectType):
    class Meta:
        interfaces = (graphene.relay.Node,)

    title = graphene.String()
    status = graphene.Int()

    def __str__(self):
        return 'Item("%s", "%s")' % (self.id, self.title)

    @classmethod
    def get_node(cls, id, context, info):
        return Item(id=id, title='ITEM-' + id)


class User(graphene.ObjectType):
    class Meta:
        interfaces = (graphene.relay.Node,)

    # TODO(burdon): Status, etc.
    title = graphene.String()

    items = relay.ConnectionField(Item)

    def __str__(self):
        return 'User("%s", "%s")' % (self.id, self.title)

    # TODO(burdon): When is this called?
    @classmethod
    def get_node(cls, id, context, info):
        print '### get_node[%s] ###' % id
        return User(id=id, title='SHOULD_LOOKUP_USER')

    # TODO(burdon): Lookup via database.
    @resolve_only_args
    def resolve_items(self, **args):
        return [
            Item(id='I-1', title='Item 1'),
            Item(id='I-2', title='Item 2'),
            Item(id='I-3', title='Item 3'),
            Item(id='I-4', title='Item 4'),
            Item(id='I-5', title='Item 5')
        ]


class Query(graphene.ObjectType):

    # Bizarrely, the function below resolves this variable name.
    # https://gist.github.com/mbrochh/9a90d24ca9d0a78e3c1d642aea0663b7

    node = relay.Node.Field()
    user = graphene.Field(User, userId=graphene.ID())
    items = graphene.List(Item, userId=graphene.ID())

    @resolve_only_args
    def resolve_user(self, userId):
        user = User(id=from_global_id(userId)[1], title='Test User')
        print 'Resolved[%s] => %s' % (userId, user)
        return user

    @resolve_only_args
    def resolve_items(self, userId):
        print '???????????????'
        items = [
            Item(id='I-1', title='Item 1'),
            Item(id='I-2', title='Item 2'),
            Item(id='I-3', title='Item 3')
        ]
        print 'Resolved[%s] => %s' % (userId, items)
        return items


schema = graphene.Schema(query=Query)
