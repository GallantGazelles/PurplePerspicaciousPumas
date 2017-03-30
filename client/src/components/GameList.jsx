'use strict';
import React from 'react';
import GameListEntry from './GameListEntry.jsx';
import { ListGroup } from 'react-bootstrap';

export default (props) => {
  let openGames = [];

  props.games.map(game => {
    if (game.gameStage === 'waiting') {
      openGames.push(game);
    }
  });

  return (
    <ListGroup id="test">
      {openGames.map( (game) => <GameListEntry sendToGame={props.sendToGame} name={game.gameName} key={game._id} game={game} />)}
    </ListGroup>
  )
}
