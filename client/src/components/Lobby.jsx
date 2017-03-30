'use strict';
import React from 'react';
import GameList from './GameList.jsx';
import $ from 'jquery';
import io from 'socket.io-client';
import CreateGame from './CreateGame.jsx';
import YourGames from './YourGames.jsx';
import PlayerDisconnected from './PlayerDisconnected.jsx'
import { Button, Form, FormGroup, Panel, ListGroup, ListGroupItem, Col, FormControl, ControlLabel, PageHeader } from 'react-bootstrap';


// TODO: build logic to prevent users from joining a full game
const lobbyChat = io();

class Lobby extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      games: null,
      username: null,
      chatroom: [],
      lobbyUsers: [],
      value: '',
      private: 0
    };


    lobbyChat.on('chat updated', messages => {
      this.setState({chatroom: messages});
      console.log('Current client side chat: ', this.state.chatroom);
    });

    lobbyChat.on('user joined lobby', userList => {
      console.log(userList);
      this.setState({lobbyUsers: userList});
      console.log('Current lobby users: ', this.state.lobbyUsers);
    });

    this.getGames = this.getGames.bind(this);
    this.sendMessageToChatroom = this.sendMessageToChatroom.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
    this.handleGameCreationChoice = this.handleGameCreationChoice.bind(this);
    this.handlePrivateState = this.handlePrivateState.bind(this);

  }

  componentDidMount() {
    this.getGames();
    this.getUsername();
  }

  getGames() {
    $.ajax({
      url: '/games',
      method: 'GET',
      headers: {'content-type': 'application/json'},
      success: (data) => {
        console.log('got games: ', data);
        this.setState({
          games: data
        })
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
          lobbyChat.emit('join lobby', {username: this.state.username});
        });
      },
      error: (err) => {
        console.log('error getting username', err);
      }
    });
  }

  handleMessageChange(event) {
    this.setState({value: event.target.value});
    console.log(this.state.value);
  }

  sendMessageToChatroom(message) {
    lobbyChat.send({message: message, username: this.state.username});
    this.setState({value: ''});
  }

  handleGameCreationChoice(event) {
    if(event.target.value === "ordinary") {
      this.setState({private: 1});
    } else if(event.target.value === "private") {
      this.setState({private : -1});
    }
  }

  handlePrivateState() {
    this.setState({private: 0});
  }

  render() {
    const currentGames = (
      <div>
        <h4>Current Games:</h4>
        {this.state.games && <GameList games={this.state.games} sendToGame={this.props.route.sendToGame} />}
      </div>
    );

    let mainPanel = currentGames;
    if (this.state.private === 1) {
      mainPanel = <CreateGame sendToGame={this.props.route.sendToGame} private={false} handlePrivateState={this.handlePrivateState}/>;
    } else if (this.state.private === -1) {
      mainPanel = <CreateGame sendToGame={this.props.route.sendToGame} private={true} handlePrivateState={this.handlePrivateState}/>;
    }


    return (
      <Col id="lobby" sm={6} smOffset={3}>
        <PageHeader>Lobby</PageHeader>
        <Button onClick={this.handleGameCreationChoice} value="ordinary">Start a New Game</Button> {   }
        <Button onClick={this.handleGameCreationChoice} value="private">Start a New Private Game</Button>
        {mainPanel}

        <input placeholder="Type here..." value={this.state.value} onChange={this.handleMessageChange}/>
        <button onClick={() => this.sendMessageToChatroom(this.state.value)}>Send</button>
        <Panel header="Users in Chat" bsStyle="primary">
          {this.state.lobbyUsers.map(user => <p>{user}</p>)}
        </Panel>
        <Panel header="Lobby Chat" bsStyle="primary">
          {this.state.chatroom.map(message => <p>{message.username}: {message.message}</p>)}
        </Panel>

      </Col>

    )
  }
}

export default Lobby;