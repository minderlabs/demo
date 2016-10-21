#
# Copyright 2016 Alien Laboratories, Inc.
#

import graphene

from graphene import relay, resolve_only_args, Field
from graphql_relay import from_global_id
from graphql_relay.connection.arrayconnection import offset_to_cursor

#
# GraphQL Schema.
# http://docs.graphene-python.org/en/latest/quickstart
# https://facebook.github.io/graphql
#

class Context(object):
    """
    Global context (allows setting of database).
    """

    def __init__(self, schema):
        self._schema = schema
        self._database = None

    def init(self, database):
        self._database = database

    @property
    def schema(self):
        return self._schema

    @property
    def database(self):
        assert self._database
        return self._database


#
# Types
#

# TODO(burdon): Nodes?
# http://docs.graphene-python.org/en/latest/relay/nodes/#custom-nodes

class Item(graphene.ObjectType):

    @classmethod
    def from_json(cls, obj):
        assert obj
        return Item(id=obj['id'], title=obj.get('title'), status=obj.get('status'))

    # @classmethod
    # def get_node(cls, id, context, info):
    #     print '### Item.get_node ###', id
    #     item_id = from_global_id(id)[1]
    #     return Item.from_json(g.database.get_item(item_id))

    class Meta:
        interfaces = (graphene.relay.Node,)

    title = graphene.String()
    status = graphene.Int()

    def __str__(self):
        return 'Item("%s", "%s", %s)' % (self.id, self.title, self.status)


class User(graphene.ObjectType):

    @classmethod
    def from_json(cls, obj):
        assert obj
        return User(id=obj['id'], title=obj.get('title'))

    # @classmethod
    # def get_node(cls, id, context, info):
    #     print '### User.get_node ###', id
    #     user_id = from_global_id(id)[1]
    #     return User.from_json(g.database.get_user(user_id))

    class Meta:
        interfaces = (graphene.relay.Node,)

    title = graphene.String()

    # Item IDs.
    # TODO(burdon): Document this.
    # TODO(burdon): Move to separate query.
    items = relay.ConnectionField(Item)

    def __str__(self):
        return 'User("%s", "%s")' % (self.id, self.title)

    @resolve_only_args
    def resolve_items(self, **args):
        return [Item.from_json(obj) for obj in g.database.get_items_for_user(self.id)]

#
# Queries.
# http://graphql.org/learn/queries
#

class Query(graphene.ObjectType):
    """
    Root query type.
    """

    # TODO(burdon): ???
    # http://docs.graphene-python.org/en/latest/relay/nodes/#custom-nodes
    node = relay.Node.Field()

    user = graphene.Field(User, user_id=graphene.ID())

    item = graphene.Field(Item, item_id=graphene.ID())

    items = graphene.List(Item, user_id=graphene.ID(), query=graphene.String())

    @resolve_only_args
    def resolve_user(self, user_id):
        local_user_id = from_global_id(user_id)[1]
        user = User.from_json(g.database.get_user(local_user_id))

        user.items = [Item.from_json(obj) for obj in g.database.get_items_for_user(local_user_id)]

        print 'Resolved[%s] => %s' % (local_user_id, user)
        return user

    @resolve_only_args
    def resolve_item(self, item_id):
        local_item_id = from_global_id(item_id)[1]
        item = Item.from_json(g.database.get_item(local_item_id))
        print 'Resolved[%s] => %s' % (local_item_id, item)
        return item

    @resolve_only_args
    def resolve_items(self, user_id):
        print '### resolve_items ###', user_id
        local_user_id = from_global_id(user_id)[1]
        items = [Item.from_json(obj) for obj in g.database.get_items_for_user(local_user_id)]
        print 'Resolved[%s] => %s' % (local_user_id, items)
        return items


#
# Mutations.
#

class CreateItemMutation(relay.ClientIDMutation):

    class Input:
        user_id = graphene.ID(required=True)
        title = graphene.String()
        status = graphene.Int()

    user = graphene.Field(User)
    item_edge = Field(Item.Connection.Edge)

    @classmethod
    def mutate_and_get_payload(cls, input, context, info):
        user_id = from_global_id(input.get('user_id'))[1]

        title = input.get('title')
        status = input.get('status')

        user = User.from_json(g.database.get_user(user_id))

        item = Item.from_json(g.database.create_item(user_id, title=title, status=status))
        item_edge = Item.Connection.Edge(cursor=offset_to_cursor(0), node=item)

        return CreateItemMutation(user=user, item_edge=item_edge)


class UpdateItemMutation(relay.ClientIDMutation):

    class Input:
        user_id = graphene.ID(required=True)
        item_id = graphene.ID(required=True)
        title = graphene.String()
        status = graphene.Int()

    user = graphene.Field(User)
    item = graphene.Field(Item)

    @classmethod
    def mutate_and_get_payload(cls, input, context, info):
        user_id = from_global_id(input.get('user_id'))[1]
        item_id = from_global_id(input.get('item_id'))[1]

        title = input.get('title')
        status = input.get('status')

        user = User.from_json(g.database.get_user(user_id))
        item = Item.from_json(g.database.update_item(user_id, item_id, title=title, status=status))

        return UpdateItemMutation(user=user, item=item)


class Mutation(graphene.ObjectType):
    """
    Root mutation type.
    """

    # TODO(burdon): Exceptions caught by framework. Local logging?
    # TODO(burdon): Document where/how IDs are sent via transport versus objects.

    create_item_mutation = CreateItemMutation.Field()
    update_item_mutation = UpdateItemMutation.Field()


#
# Main schema def.
#

g = Context(graphene.Schema(query=Query, mutation=Mutation))
