//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ID, ItemReducer } from 'minder-core';

import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../../data/mutations';
import { Path } from '../../path';
import { composeItem, CardContainer, ItemFragment } from '../item';

import './team.less';

/**
 * Type-specific fragment.
 */
const GroupFragment = gql`
  fragment GroupFragment on Group {
    id 
    members {
      id
      type
      title
    }
    
    # TODO(burdon): Shouldn't be part of Group. Instead link.
    projects {
      id
      title
    }
  }
`;

/**
 * Type-specific query.
 */
const TeamQuery = gql`
  query TeamQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...GroupFragment
    }
  }

  ${ItemFragment}
  ${GroupFragment}  
`;

/**
 * Type-specific card container.
 *
 * NOTE: Team is a card view for the Group item type.
 */
class TeamCard extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(GroupFragment)
  };

  render() {
    let { user, item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <TeamLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class TeamLayout extends React.Component {

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      inlineEdit: false
    };
  }

  handleItemSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  handleProjectAdd() {
    this.setState({ inlineEdit: true });
  }

  handleProjectSave() {
    let { user, item } = this.props;

    let title = this.refs.title.value;
    if (_.isEmpty(title)) {
      this.refs.title.focus();
      return;
    }

    // TODO(burdon): Factor out item construction.

    // Create project.
    let mutations = [
      {
        field: 'title',
        value: {
          string: title
        }
      },
      {
        field: 'team',
        value: {
          id: item.id
        }
      }
    ];

    this.context.mutator.createItem('Project', mutations);

    this.setState({ inlineEdit: false });
  }

  handleProjectCancel() {
    this.setState({ inlineEdit: false });
  }

  render() {
    let { user, item } = this.props;
    if (!user || !item) {
      return null;
    }

    // TODO(burdon): Factor out list generators.

    const itemList = (type, items, icon) => {
      return items.map(item => (
        <div key={ item.id } className="ux-list-item ux-row ux-data-row">
          <Link to={ Path.detail(type, ID.toGlobalId(type, item.id)) }>
            <i className="ux-icon">{ icon }</i>
          </Link>
          <div className="ux-text ux-expand">{ item.title }</div>
        </div>
      ));
    };

    const itemEditor = (icon) => (
      <div className="ux-list-item ux-row ux-data-row">
        <i className="ux-icon">{ icon }</i>
        <TextBox ref="title"
                 className="ux-expand" autoFocus={ true }
                 onEnter={ this.handleProjectSave.bind(this) }
                 onCancel={ this.handleProjectCancel.bind(this)} />
        <i className="ux-icon ux-icon-save" onClick={ this.handleProjectSave.bind(this) }>check</i>
        <i className="ux-icon ux-icon-cancel" onClick={ this.handleProjectCancel.bind(this) }>cancel</i>
      </div>
    );

    return (
      <div className="app-type-group ux-column">

        <div className="ux-column">
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Members</h3>
          </div>
          <div className="ux-list">
            { itemList('User', item.members, 'accessibility') }
          </div>
        </div>

        <div className="ux-column">
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Projects</h3>
            <i className="ux-icon ux-icon-add" onClick={ this.handleProjectAdd.bind(this) }></i>
          </div>
          <div className="ux-list">
            { itemList('Project', item.projects, 'assignment') }
            { this.state.inlineEdit && itemEditor('assignment') }
          </div>
        </div>

      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(
  new ItemReducer(UpdateItemMutation, TeamQuery)
)(TeamCard);
