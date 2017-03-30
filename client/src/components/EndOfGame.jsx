'use strict';
import React from 'react';
import Score from './PlayingGameComponents/Score.jsx';
import GameWinner from './PlayingGameComponents/GameWinner.jsx';
import RoundSummary from './RoundSummary.jsx';
import { Col, PageHeader, Button } from 'react-bootstrap';

const EndOfGame = ({game, sendToLobby}) => {
  // Reverse order of rounds and judges
  let rounds = game.rounds.slice().reverse();
  let judges = game.players.slice().reverse();
  console.log('Rounds and judges', rounds, judges);

	return (
		<Col id="end-of-game">
		  <PageHeader>Game Over</PageHeader>
	    <Col sm={6} smOffset={3}>
	      <h4>Final Score</h4>
	      <Score game={game}/>
        <br />
        <GameWinner game={game}/>
			  <br />
			  <RoundSummary round={game.rounds[3]} judge={game.players[3]}/>
			  <br />
			  <RoundSummary round={game.rounds[2]} judge={game.players[2]}/>
			  <br />
			  <RoundSummary round={game.rounds[1]} judge={game.players[1]}/>
			  <br />
			  <RoundSummary round={game.rounds[0]} judge={game.players[0]}/>
			  <br />
        <Button onClick={sendToLobby()}>
          Return to Lobby
        </Button>
	    </Col>
		</Col>
	)
}

export default EndOfGame;
