'use strict';
import React from 'react';
import WaitingRoom from './WaitingRoom.jsx';
import PlayingGame from './PlayingGame.jsx';
import EndOfGame from './EndOfGame.jsx';
import $ from 'jquery';
import io from 'socket.io-client';
import { PageHeader } from 'react-bootstrap';

const socket = io();

class Game extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      game: null,
      username: null
    };

    this.getGameData = this.getGameData.bind(this);
    this.getUsername = this.getUsername.bind(this);
    this.leaveGame = this.leaveGame.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.handlePromptSubmission = this.handlePromptSubmission.bind(this);
    this.handleJudgeSelection = this.handleJudgeSelection.bind(this);
    this.handleReadyToMoveOn = this.handleReadyToMoveOn.bind(this);

    socket.on('update waiting room', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('start game', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('prompt added', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('start judging', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('winner chosen', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('start next round', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('game over', (gameObj) => {
      this.setState({game: gameObj});
    })
    socket.on('disconnectTimeOut', () => {
      // this function is related to the commented out function
      // in server/index.js
      console.log('disconnectTimeOut')
      this.props.route.sendToLobby.call(this, true);
    })

  }

  componentDidMount() {
    // Get game name from the route url params
    // Sends GET request to current server
    this.getGameData(this.props.params.gamename);
    this.getUsername();
  }


  getGameData(gameName) {
    // use gameName to retrieve gameInstance obj of that game
    $.ajax({
      url: '/game',
      method: 'GET',
      headers: {'content-type': 'application/json'},
      data: {name: gameName},
      success: (data) => {
        this.setState({game: data[0]})
      },
      error: (err) => {
        console.log('error getting games: ', err);
      }
    });
  }

  getUsername() {
    $.ajax({
      url: '/username',
      method: 'GET',
      headers: {'content-type': 'application/json'},
      success: (username) => {
        this.setState({username: username}, function() {
          socket.emit('join game', {gameName: this.props.params.gamename, username: this.state.username});
        });
      },
      error: (err) => {
        console.log('error getting username', err);
      }
    });
  }

  leaveGame() {
    let currentPlayers = this.state.game.players.length;

    if (currentPlayers === 1) {
      let exitGameChoice = confirm('You are the only player. Are you sure you want to destroy this game?');

      if (exitGameChoice) {
        socket.emit('leave game', {gameName: this.props.params.gamename, username: this.state.username});
      }
    } else {
      socket.emit('leave game', {gameName: this.props.params.gamename, username: this.state.username});
    }
  }

  handleResponse(response) {
    socket.emit('submit response', {gameName: this.props.params.gamename, username: this.state.username, response: response});
  }

  handleJudgeSelection(winner) {
    socket.emit('judge selection', {gameName: this.props.params.gamename, winner: winner});
  }

  handleReadyToMoveOn() {
    socket.emit('ready to move on', {gameName: this.props.params.gamename, username: this.state.username});
  }

  handlePromptSubmission(prompt) {
    socket.emit('prompt created', {gameName: this.props.params.gamename, prompt: prompt});
  }

  render() {
    return (
      <div id="game">
        {this.state.game && this.state.username && this.state.game.gameStage === 'waiting' && <WaitingRoom game={this.state.game} user={this.state.username} sendToLobby={this.props.route.sendToLobby} leaveGame={this.leaveGame} />}
        {this.state.game && this.state.username && this.state.game.gameStage === 'playing' && <PlayingGame game={this.state.game} user={this.state.username} handleResponse={this.handleResponse} handlePromptSubmission={this.handlePromptSubmission} handleJudgeSelection={this.handleJudgeSelection} handleReadyToMoveOn={this.handleReadyToMoveOn}/>}
        {this.state.game && this.state.username && this.state.game.gameStage === 'gameover' && <EndOfGame game={this.state.game} sendToLobby={this.props.route.sendToLobby}/>}
      </div>
    )
  }
}

export default Game;