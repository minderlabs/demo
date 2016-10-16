#
# Copyright 2016 Alien Laboratories, Inc.
#

#
# http://docs.graphene-python.org/en/latest/quickstart/
#

import graphene


class User(graphene.ObjectType):
    id = graphene.ID()
    title = graphene.String()


class Query(graphene.ObjectType):

    # Bizarrely, the function below resolves this variable name.
    user = graphene.Field(User)

    # TODO(burdon): Global ID?
    def resolve_user(self, args, context, info):
        return User(id='U-1', title = 'Test User')


schema = graphene.Schema(query=Query)
