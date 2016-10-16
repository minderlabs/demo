#
# Copyright 2016 Alien Laboratories, Inc.
#

#
# http://docs.graphene-python.org/en/latest/quickstart/
#

import graphene


# TODO(burdon): User type.

class Query(graphene.ObjectType):

    # Bizarrely, the function below resolves this variable name.
    user = graphene.String()

    def resolve_user(self, args, context, info):
        return 'Test User'


schema = graphene.Schema(query=Query)
