'use strict';
import React from 'react';
import WaitingRoom from './WaitingRoom.jsx';
import PlayingGame from './PlayingGame.jsx';
import EndOfGame from './EndOfGame.jsx';
import $ from 'jquery';
import axios from 'axios';
import io from 'socket.io-client';
import { Col, PageHeader, Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

class Game extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      game: null,
      username: null,
      time: null,
      gameChat: [],
      value: ''
    };

    this.getGameData = this.getGameData.bind(this);
    this.getUsername = this.getUsername.bind(this);
    this.leaveGame = this.leaveGame.bind(this);
    this.sendMessageToChatroom = this.sendMessageToChatroom.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.handlePromptSubmission = this.handlePromptSubmission.bind(this);
    this.handleJudgeSelection = this.handleJudgeSelection.bind(this);
    this.handleReadyToMoveOn = this.handleReadyToMoveOn.bind(this);

    this.props.route.ioSocket.on('update waiting room', (gameObj) => {
      //{gameStage: 'waiting'}
      this.setState({game: gameObj});
    })
    this.props.route.ioSocket.on('start game', (gameObj) => {
      this.setState({game: gameObj});
      console.log('round starts!')
      this.props.route.ioSocket.emit('round started', {
        gameName: this.state.game.gameName,
        username: this.state.username
      })
    })
    this.props.route.ioSocket.on('prompt added', (gameObj) => {
      this.setState({game: gameObj});
    })
    this.props.route.ioSocket.on('start judging', (gameObj) => {
      this.setState({game: gameObj});
      this.props.route.ioSocket.emit('judging timer', {
        gameName: this.state.game.gameName
      })
    })

    this.props.route.ioSocket.on('winner chosen', (gameObj) => {
      this.setState({game: gameObj});
    })
    this.props.route.ioSocket.on('start next round', (gameObj) => {
      this.setState({game: gameObj});
      this.props.route.ioSocket.emit('round started', {
        gameName: this.state.game.gameName,
        username: this.state.username
      })
    })

    this.props.route.ioSocket.on('game over', (gameObj) => {
      this.setState({game: gameObj});
    })

    this.props.route.ioSocket.on('timer', (data) => {
      this.setState({time: data.time})
    })

    this.props.route.ioSocket.on('game chat updated', data => {
      console.log('Chat room data', data);
      this.setState({gameChat: data});
      console.log('Current chat', this.state.gameChat);
    })

  }

  componentWillMount() {
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
    axios.get('/username')
      .then(data => {
        let {username} = data.data;
        this.setState({username: username}, function() {
          this.props.route.ioSocket.emit('join game', {gameName: this.props.params.gamename, username: this.state.username});
        });
      })
      .catch(error => console.log('error getting username', error))
  }

  leaveGame() {
    let currentPlayers = this.state.game.players.length;
    let exitGameChoice = confirm('You are the only player. Are you sure you want to destroy this game?');
    this.props.route.ioSocket.emit('leave game', {gameName: this.props.params.gamename, username: this.state.username});

    return exitGameChoice;
  }

  sendMessageToChatroom(message) {
    this.props.route.ioSocket.emit('game chat', {gameName: this.props.params.gamename, message: message, username: this.state.username});
    this.setState({value: ''});
  }

  handleMessageChange(event) {
    this.setState({value: event.target.value});
  }

  handleResponse(response) {
    this.props.route.ioSocket.emit('submit response', {gameName: this.props.params.gamename, username: this.state.username, response: response});
  }

  handleJudgeSelection(winner) {
    this.props.route.ioSocket.emit('judge selection', {gameName: this.props.params.gamename, winner: winner});
  }

  handleReadyToMoveOn() {
    console.log('move on triggered')
    this.props.route.ioSocket.emit('ready to move on', {gameName: this.props.params.gamename, username: this.state.username});
  }

  handlePromptSubmission(prompt) {
    this.props.route.ioSocket.emit('prompt created', {gameName: this.props.params.gamename, prompt: prompt});
  }

  render() {
    return (
      <div id="game">
        <Col sm={6} smOffset={3}>
          {this.state.game && this.state.username && this.state.game.gameStage === 'waiting' && <WaitingRoom game={this.state.game} time={this.state.time} user={this.state.username} sendToLobby={this.props.route.sendToLobby} leaveGame={this.leaveGame} />}
          {this.state.game && this.state.username && this.state.game.gameStage === 'playing' && <PlayingGame game={this.state.game} time={this.state.time} user={this.state.username} handleResponse={this.handleResponse} handlePromptSubmission={this.handlePromptSubmission} handleJudgeSelection={this.handleJudgeSelection} handleReadyToMoveOn={this.handleReadyToMoveOn}/>}
          {this.state.game && this.state.username && this.state.game.gameStage === 'gameover' && <EndOfGame game={this.state.game} sendToLobby={this.props.route.sendToLobby}/>}
        </Col>
        <Col sm={6} smOffset={3}>
          <input placeholder="Type here..." value={this.state.value} onChange={this.handleMessageChange}/>
          <button onClick={() => this.sendMessageToChatroom(this.state.value)}>Send</button>
          <Panel header="Game Chat" bsStyle="primary">
            {this.state.gameChat.map(message => <p>{message.username}: {message.message}</p>)}
          </Panel>
        </Col>
      </div>
    )
  }
}

export default Game;