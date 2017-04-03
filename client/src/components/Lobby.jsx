'use strict';
import React from 'react';
import GameList from './GameList.jsx';
import $ from 'jquery';
import axios from 'axios';
import CreateGame from './CreateGame.jsx';
import PlayerDisconnected from './PlayerDisconnected.jsx'
import { Button, Form, FormGroup, Panel, ListGroup, ListGroupItem, Col, FormControl, ControlLabel, PageHeader } from 'react-bootstrap';
var Filter = require('bad-words');
var filter = new Filter();

// TODO: build logic to prevent users from joining a full game

class Lobby extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      games: null,
      username: null,
      chatroom: [],
      allUsers: [],
      lobbyUsers: [],
      friendList: [],
      friendsList: [],
      value: '',
      private: 0,
      addFriend: false,
      friendName: ''
    };

    this.props.route.ioSocket.on('chat updated', messages => {
      this.setState({chatroom: messages});
      console.log('Current client side chat: ', this.state.chatroom);
    });
    this.props.route.ioSocket.on('user joined lobby', userList => {
      this.setState({lobbyUsers: userList});
      console.log('Current lobby users: ', this.state.lobbyUsers);
    });
    this.props.route.ioSocket.on('get games', (data) => {
      console.log(data.games);
      this.setState({games: data.games});
    });
    this.props.route.ioSocket.on('update games', (data) => {
      console.log('Updating games from manager', data.games);
      this.setState({games: data.games});
    });
    this.props.route.ioSocket.on('ALL_USERS_UPDATED', data => {
      console.log('All users received', data);
      this.setState({allUsers: data}, this.updateFriendsListStatus(data, this.state.friendList));
    });

    this.getGames = this.getGames.bind(this);
    this.sendMessageToChatroom = this.sendMessageToChatroom.bind(this);
    this.handleMessageChange = this.handleMessageChange.bind(this);
    this.handleGameCreationChoice = this.handleGameCreationChoice.bind(this);
    this.handlePrivateState = this.handlePrivateState.bind(this);
    this.showFriendNameInput = this.showFriendNameInput.bind(this);
    this.handleAddFriendByInputName = this.handleAddFriendByInputName.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  componentWillMount() {
    this.getGames().then(this.getUsername());
  }

  getGames() {
    return axios.get('/games')
      .then(data => this.setState({games: data.data}))
      .catch(err => console.log('error getting games: ', err))
  }

  getUsername() {
    return axios.get('/username')
      .then(data => {
        let {username, friendList} = data.data;
        if (!friendList) {
          friendList = [];
        }
        console.log('Friend list: ', friendList);
        this.setState({username: username, friendList: friendList}, function() {
          this.props.route.ioSocket.emit('join lobby', {username: this.state.username});
        });
      })
      .catch(error => console.log('error getting username', error))
  }

  handleMessageChange(event) {
    this.setState({value: event.target.value});
  }

  sendMessageToChatroom(message) {
    this.props.route.ioSocket.send({message: filter.clean(message), username: this.state.username});
    this.setState({value: ''});
  }

  handleGameCreationChoice(event) {
    if (event.target.value === "ordinary") {
      this.setState({private: 1});
    } else if (event.target.value === "private") {
      this.setState({private: -1});
    }
  }

  handlePrivateState() {
    this.setState({private: 0});
  }


  addToFriendList(friend, currentUser, typedIn) {
    axios.post('/friends', {friend: friend, username: currentUser, typedIn: typedIn})
      .then(response => {
        alert('Friend added!');
        this.setState({friendList: response.data});
      })
      .catch(error => error.responseText ? alert(error.responseText) : alert(`Error adding friend! ${error}`))
  }

  showFriendNameInput() {
    //toggle a flag here to showup the form
    this.setState(prevState => ({addFriend: !prevState.addFriend}));
  }

  handleAddFriendByClick(event) {
    if (event !== this.state.username) {
      this.addToFriendList(event, this.state.username, false);
    } else {
      alert('Sorry, you can\'t add yourself.');
    }
  }

  handleAddFriendByInputName(event) {
    event.preventDefault();
    this.addToFriendList(this.state.friendName, this.state.username, true);
    this.showFriendNameInput();
    this.setState({value: ''});
  }

  handleInputChange(event) {
    this.setState({friendName: event.target.value});
  }

  handleLogout() {
    let logoutFunc = this.props.route.sendToHomePage;

    this.props.route.ioSocket.emit('leave lobby', this.state,
      axios.get('/logout')
        .then(data => logoutFunc())
        .catch(error => console.log(`Error logging out ${error}`)
      )
    );
  }

  updateFriendsListStatus(allCurrentUsers, allFriends) {
    // Create new array of objects with current Friend's status of online or offline
    let results = allFriends.reduce((list, friend) => {
      if (allCurrentUsers[friend]) {
        list.push([friend, allCurrentUsers[friend].room])
      } else {
        list.push([friend, 'offline'])
      }

      return list;
    }, []);

    console.log('Friend list with status', results);
    this.setState({friendsList: results}, this.updateLobbyUsers(allCurrentUsers));
  }

  updateLobbyUsers(users) {
    let results = [];
    console.log('All users', users);
    for (let user in users) {
      if (users[user].room === 'lobby') {
        console.log(user);
        results.push(user);
      }
    }

    console.log('Results!', results);
    this.setState({lobbyUsers: results});
  }

  render() {
    const currentGames = (
      <div>
        <h4>Current Games:</h4>
        {this.state.games && <GameList username={this.state.username} games={this.state.games} sendToGame={this.props.route.sendToGame} />}
      </div>
    );

    let mainPanel = currentGames;
    if (this.state.private === 1) {
      mainPanel = <CreateGame username={this.state.username} sendToGame={this.props.route.sendToGame} private={false} handlePrivateState={this.handlePrivateState}/>;
    } else if (this.state.private === -1) {
      mainPanel = <CreateGame username={this.state.username} sendToGame={this.props.route.sendToGame} private={true} handlePrivateState={this.handlePrivateState}/>;
    }

    const lobbyUsersHeader = (<span>
      <span>Users in Chat</span>
      {"    "}
      <Button bsSize="xsmall" bsStyle="info" onClick={this.showFriendNameInput}>Add a friend by name
      </Button>
    </span>);

    const addFriend = (
      <Form inline>
        <FormControl type="text" placeholder="Type your friend's username" onChange={this.handleInputChange} />
      <Button type="submit" onClick={this.handleAddFriendByInputName}>Add</Button>
      </Form>
    );


    return (
      <Col id="lobby" sm={6} smOffset={3}>
        <PageHeader>Lobby for {this.state.username} {  }<Button onClick={this.handleLogout}>Logout</Button></PageHeader>
        <Button onClick={this.handleGameCreationChoice} value="ordinary">Start a New Game</Button> {   }

        <Button onClick={this.handleGameCreationChoice} value="private">Start a New Private Game</Button>

        {mainPanel}

        <Panel header="Friends" bsStyle="primary">
          {this.state.friendsList.map(friend => <p>{friend[0]} :: {friend[1]}</p>)}
        </Panel>
        {"             "}

        <Panel header={lobbyUsersHeader} bsStyle="primary">
          {this.state.lobbyUsers.map(user => (<div><span>{user}</span> <Button value={user} onClick={() => this.handleAddFriendByClick(user)} >Add friend</Button></div>))}
          {this.state.addFriend ? addFriend : null}
        </Panel>
        <input placeholder="Type here..." value={this.state.value} onChange={this.handleMessageChange}/>
        <button onClick={() => this.sendMessageToChatroom(this.state.value)}>Send</button>
        <Panel header="Lobby Chat" bsStyle="primary">
          {this.state.chatroom.map(message => <p>{message.username}: {message.message}</p>)}
        </Panel>
      </Col>
    )
  }
}

export default Lobby;
