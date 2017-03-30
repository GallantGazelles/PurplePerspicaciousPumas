var express = require('express');
var bodyParser = require('body-parser');
var models = require('../db/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var User = models.userModel;
var Game = models.gameInstanceModel;
var queries = require('../db/db-queries.js');
var helpers = require('./helpers.js');

var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'orange-to-orange'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/../client/dist'));

// passport config
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.post('/signup', function (req, res) {
  User.register(new User({username: req.body.username, email: req.body.email}), req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      return res.status(400).send(err);
    }
    console.log('registered User');

    passport.authenticate('local')(req, res, function() {
      res.status(201).send('created');
    })
  });
})

app.post('/login', passport.authenticate('local'), function(req, res) {
  console.log('in login request');
  res.status(201).send('success')
})

app.get('/test', passport.authenticate('local'), function(req, res) {
  res.status(200).send('success')
})

app.get('/games', function(req, res) {
  var promise = Game.find({}).exec();

  promise.then(function(games) {
    var sortedGames = [];
    var gameNameFirstWords = games.map(function(game){
      return game.gameName.split(/\W+/, 1)[0].toLowerCase();
    })
    var sortedGameNameFirstWords = gameNameFirstWords.slice().sort();
    for(var i = 0; i < sortedGameNameFirstWords.length; i++){
      var index = gameNameFirstWords.indexOf(sortedGameNameFirstWords[i]);
      sortedGames.push(games[index]);
      gameNameFirstWords[index] = null;
    }
    res.send(sortedGames);
  })
});

app.post('/games', function(req, res) {
  var gameInstance = req.body;
  console.log('Game Instance: ', gameInstance);

  helpers.addPrompts(gameInstance);

  Game.create(gameInstance, function(err) {
    if (err) {
      res.status(400).send(err);
    } else {
      res.status(201).send('success creating game in db');
    }
  })
})

app.get('/game', function(req, res) {
  var name = req.query.name;
  var promise = Game.find({gameName: name}).exec();

  promise.then(function(game) {
    res.json(game);
  })
});

app.get('/username', function(req, res) {
  var user = req.session.passport.user;
  res.status(200).send(user);
});


var server = app.listen(port, function() {
  console.log('App is listening on port: ', port);
});

//SOCKETS 

var io = require('socket.io')(server);

const Sockets = {};
const Rooms = {};
let userSockets = {};
let lobbyUsers = [];
let lobbyChatMessages = [];


io.on('connection', (socket) => {
  console.log(`A user connected to the socket`);

  socket.on('join lobby', data => {
    const username = data.username;

    // Add user to the userSockets object so if they disconnect we know who it was.
    userSockets[socket.id] = username;
    console.log('Sockets', userSockets);
    console.log(`${username} has joined the lobby!`)
    socket.join('lobby');

    for (let username in userSockets) {
      if (!lobbyUsers.includes(userSockets[username])) {
        lobbyUsers.push(userSockets[username]);
      }
    }

    // Send current chat messages to new user that joined
    io.to('lobby').emit('chat updated', lobbyChatMessages);
    console.log('Lobby users: ', lobbyUsers);
    io.to('lobby').emit('user joined lobby', lobbyUsers);
    console.log('it fired');
  });

  socket.on('join game', function(data) {
    // data needs to be gamename and username
    const { username, gameName } = data;

    console.log(`${username} is joining room: ${gameName}`);
    socket.join(gameName);

    Sockets[socket] = gameName;
    console.log(`Sockets: ${Sockets[socket]}`);

    Rooms[gameName] ? Rooms[gameName]++ : Rooms[gameName] = 1;
    console.log(`Rooms: ${Rooms[gameName]}`);


    queries.retrieveGameInstance(gameName)
    .then(game => {
      // add client to game DB if they're not already in players list
      if (!game.players.includes(username)) {
        return queries.addPlayerToGameInstance(gameName, username);
      }
    })
    .then(game => {
      const { players, gameStage } = game.value;
      console.log('DATA!', players.length, gameStage);

      if (players.length === 4 && gameStage === 'waiting') {
        queries.setGameInstanceGameStageToPlaying(gameName)
          .then(game => {
            console.log('Starting game: ', game.value)
            io.to(gameName).emit('start game', game.value)
          });
      } else {
        console.log('Joining Game: ', game.value);
        io.to(gameName).emit('update waiting room', game.value);

      }
    })
    .catch(error => console.log(error))
  });

  socket.on('leave game', (data) => {
    const { username, gameName } = data;

    queries.retrieveGameInstance(gameName)
      .then(game => {
        if (game.players.includes(username)) {
          let currentPlayers = game.players.filter(player => player !== username);

          return queries.removePlayerFromGameInstance(gameName, username);
        } else {
          console.log('Error, username not found');
          return 'Error';
        }
      })
      .then(game => {
        if (game.value.players.length > 0) {
          io.to(gameName).emit('update waiting room', game.value)
        } else {
          // If number of players is now zero then destroy that room
          queries.destroyGameInstance(gameName);
        }
        console.log(`${username} is leaving room: ${gameName}`);
        socket.leave(gameName);
      })
      .catch(error => console.log(error))
  });

  socket.on('prompt created', (data) => {
    var gameName = data.gameName;
    var prompt = data.prompt;

    queries.retrieveGameInstance(gameName)
    .then(function(game) {
      var currentRound = game.currentRound;
      var Rounds = game.rounds.slice(0);

      Rounds[currentRound].prompt = prompt;
      Rounds[currentRound].stage++;

      queries.updateRounds(gameName, Rounds)
      .then(function() {
        queries.retrieveGameInstance(gameName)
        .then(function(game) {
          io.to(gameName).emit('prompt added', game);
        })
      })
    })
  })


  socket.on('submit response', (data) => {
    var gameName = data.gameName;
    var username = data.username;
    var response = data.response;

    queries.retrieveGameInstance(gameName)
    .then(function(game) {
      var currentRound = game.currentRound;
      var currentResponses = game.rounds[currentRound].responses;
      var currentRounds = game.rounds;

      if (!helpers.userAlreadySubmitted(username, currentResponses)) {
        currentRounds[currentRound].responses.push([response, username]);

        if (currentRounds[currentRound].responses.length === 3) {
          currentRounds[currentRound].stage++;
        }
        //update rounds property of the game in DB w/ new responses and stage
        return queries.updateRounds(gameName, currentRounds)
        .then(function() {
        // check if there are 3 responses
          // if there are 3 responses go to current Round in round array and increment stage by 1
          // retrieve updated game from DB
          // emit 'start judging' with game instance obj as data
          if (currentRounds[currentRound].responses.length === 3) {
            return queries.retrieveGameInstance(gameName)
            .then(function(game) {
              io.to(gameName).emit('start judging', game);
            })
          }
        })
      }
    }).catch(function(error) {
      console.log(error);
      throw error;
    })
  })


  // on 'judge selection' 
  socket.on('judge selection', (data) => {
    var gameName = data.gameName;
    var winner = data.winner;
    queries.retrieveGameInstance(gameName)
    .then(function (game) {
      var currentRound = game.currentRound;
      var currentResponses = game.rounds[currentRound].responses;
      var Rounds = game.rounds.slice(0);
      Rounds[currentRound].winner = winner;
      Rounds[currentRound].stage++;
      queries.updateRounds(gameName, Rounds)
      .then(function () {
        queries.retrieveGameInstance(gameName)
        .then(function (game) {
            if (game.currentRound < 3) {
              io.to(gameName).emit('winner chosen', game);
            } else {
              queries.setGameInstanceGameStageToGameOver(gameName).then(function () {
                queries.retrieveGameInstance(gameName).then(function (game) {
                  io.to(gameName).emit('game over', game);
                })
              })
            }
          })
        })
    }).catch(function(error) {
      console.log(error);
      throw error;
    })
  })
  // 
  socket.on('ready to move on', (data) => {
    console.log('rdy');
    const { username, gameName } = data;

    queries.retrieveGameInstance(gameName)
    .then(game => {
      console.log('Ready to move on game data: ', game);
      var currentRound = game.currentRound;
      var Rounds = game.rounds.slice(0);
      if (!Rounds[currentRound].ready.includes(username)) {
        Rounds[currentRound].ready.push(username);
        queries.updateRounds(gameName, Rounds)
        .then(function() {
          if (Rounds[currentRound].ready.length === 4) {
            currentRound++;
            queries.updateCurrentRound(gameName, currentRound)
            .then(function() {
              queries.retrieveGameInstance(gameName)
              .then(function(game) {
                io.to(gameName).emit('start next round', game);
              })
            })
          }
        })
      }
    }).catch(function(error) {
      console.log(error);
      throw error;
    })
  })

  // socket.on('disconnect', (data) => {
  //   if (Rooms[Sockets[socket]]) {
  //     Rooms[Sockets[socket]]--;
  //     var timer = 60;
  //     var disconnectTimeOut = function() {
  //       setTimeout(function(){
  //         if (timer === 0 && Rooms[Sockets[socket]] < 4) {
  //           console.log('disconnectTimeOut')
  //           queries.setGameInstanceGameStageToGameOver(Sockets[socket])
  //           .then(function(){
  //             console.log(Sockets[socket]);
  //               io.to(Sockets[socket]).emit('disconnectTimeOut');
  //           })
  //         } else {
  //           if (Rooms[Sockets[socket]] < 4) {
  //             console.log(timer, Rooms[Sockets[socket]]);
  //             timer = timer - 1;
  //             disconnectTimeOut();
  //           }
  //         }
  //       }, 1000);
  //     }
  //     queries.retrieveGameInstance(Sockets[socket])
  //     .then(function(game) {
  //       if (game.gameStage === 'playing') {
  //         disconnectTimeOut();
  //       }
  //     });
  //   }

  //   console.log('a user disconnected', data);
  // });

  socket.on('disconnect', data => {
    console.log('Someone disconnected!');
    let username = userSockets[socket.id];
    delete userSockets[socket.id];
    lobbyUsers = lobbyUsers.filter(user => user !== username);
    io.to('lobby').emit('user joined lobby', lobbyUsers);
  })


  // LOBBY CHAT
  socket.on('message', (data) => {
    console.log('Message received: ', data);
    lobbyChatMessages.push(data);
    console.log('Current chat: ', lobbyChatMessages);
    io.to('lobby').emit('chat updated', lobbyChatMessages);
  });

});

