#
# Copyright 2016 Alien Laboratories, Inc.
#

#
# http://docs.graphene-python.org/en/latest/quickstart/
#

import graphene


class Query(graphene.ObjectType):
    hello = graphene.String()

    def resolve_hello(self, args, context, info):
        return 'World'


schema = graphene.Schema(query=Query)
