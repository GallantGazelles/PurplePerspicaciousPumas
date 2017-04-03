import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import SignUp from './components/SignUp.jsx';
import { Router, Route, hashHistory } from 'react-router';
import Lobby from './components/Lobby.jsx';
import Home from './components/Home.jsx';
import Game from './components/Game.jsx';
import io from 'socket.io-client';

const ioSocket = io();

class App extends Component {
  constructor(props){
    super(props);
    this.state = {};

    this.sendToGame = this.sendToGame.bind(this);
    this.sendToLobby = this.sendToLobby.bind(this);
    this.sendToHomePage = this.sendToHomePage.bind(this);
  }

  sendToLobby(username) {
    hashHistory.push('/lobby');
  }

  sendToGame(gameName, username) {
    // ioSocket.emit('leave lobby', {id: ioSocket.id, username: username});
    hashHistory.push(/game/ + gameName);
  }

  sendToHomePage() {
    hashHistory.push('/');
  }

  render() {
    return (
      <div>
        <Router history={hashHistory}>
          <Route path="/"
            component={Home}
            sendToLobby={this.sendToLobby}
            handleSignUp={this.handleSignUp}
            handleLogIn={this.handleLogIn} />
          <Route path="/lobby"
            component={Lobby}
            ioSocket={ioSocket}
            sendToGame={this.sendToGame}
            sendToHomePage={this.sendToHomePage} />
          <Route path="/game/:gamename"
            component={Game}
            ioSocket={ioSocket}
            sendToLobby={this.sendToLobby} />
        </Router>
      </div>
    );
  }
}

ReactDOM.render(
  <App/>,
  document.getElementById('app')
);

