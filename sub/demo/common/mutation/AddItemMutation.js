import Relay from 'react-relay';

export default class AddItemMutation extends Relay.Mutation {

  static fragments = {
    user: () => Relay.QL`
      fragment on User {
        id
      }
    `
  };

  getMutation() {
    return Relay.QL`mutation { itemMutation }`;
  }

  getVariables() {
    return {
      title: this.props.title
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on ItemMutationPayload @relay(pattern: true) {
        user {
          items
        },
        newItemEdge
      }
    `;

  }

  getConfigs() {
    return [{
      type: 'RANGE_ADD',
      parentName: 'user',
      parentID: this.props.user.id,
      connectionName: 'items',
      edgeName: 'newItemEdge',
      rangeBehaviors: {
        '': 'append',
        'orderby(oldest)': 'prepend'
      }
    }];
  }

}
