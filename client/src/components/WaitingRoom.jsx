'use strict';
import React from 'react';
import Rules from './Rules.jsx';
import { Col, PageHeader, ListGroup, ListGroupItem } from 'react-bootstrap';

export default (props) => (
  <Col id='waiting-room'>
  <PageHeader>{props.game.gameName} <small>Waiting Room</small></PageHeader>
    <h3>Number of Players: {props.game.players.length} / 4</h3>
    <br />
    <h4>Current Players:</h4>
    <Col sm={4} smOffset={4}>
      <ListGroup>
        {props.game.players.map( (player) => <ListGroupItem>{player}</ListGroupItem>)}
      </ListGroup>
    </Col>
    <Col sm={6} smOffset={3}>
      <button onClick={() => { props.leaveGame(); props.sendToLobby(); }}>Leave Game</button>
      <Rules/>
    </Col>
  </Col>
)
