'use strict';
import React from 'react';
import GameListEntry from './GameListEntry.jsx';
import { ListGroup } from 'react-bootstrap';


const YourGames = (props) => {
  let yourGames = [];
    props.games.map((game) => {if( (game.gameStage === 'waiting' || game.gameStage === 'playing') && game.players.includes(props.username)){ yourGames.push(game)}});

  let header = '';

  if (yourGames.length > 0) {
    header = <h4>Your Games</h4>;
  }

  return  (
    <div>
      {header}
      <ListGroup id="YourGames">
        {yourGames.map( (game) => <GameListEntry sendToGame={props.sendToGame} name={game.gameName} key={game._id} game={game} />)}
      </ListGroup>
    </div>
  )
}


export default YourGames;