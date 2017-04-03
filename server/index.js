var express = require('express');
var bodyParser = require('body-parser');
var models = require('../db/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var queries = require('../db/db-queries.js');
var UserQueries = require('../db/db-usermodels-queries.js');
var helpers = require('./helpers.js');

var User = models.userModel;
var Game = models.gameInstanceModel;

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


// ROUTES
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
  console.log('request session:', req.session);
  res.status(201).send('success')
})

app.get('/test', passport.authenticate('local'), function(req, res) {
  res.status(200).send('success')
})

app.get('/games', function(req, res) {
  var promise = Game.find({}).exec();
  console.log('games session: ', req.session);
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

app.post('/friends', function(req, res) {
   if (req.body.typedIn) {
    UserQueries.selectUserByName(req.body.friend)
      .then((data) => {
        if (!data) {
          res.status(400).send('This person doesn\'t exist!');
        } else {
          UserQueries.addFriendToList(req.body.friend, req.body.username)
            .then(data => {
              res.status(201).send(data.value.friendList);
            })
          .catch((err) => {
            res.status(400).send('Uh oh, there\'s an error adding friend');
          });
        }
      })
      .catch(err => {
        res.status(400).send('Uh oh, an error occured!');
      });
   } else {
    UserQueries.addFriendToList(req.body.friend, req.body.username)
      .then(data => {
        res.status(201).send(data.value.friendList);
      })
      .catch((err) => {
        res.status(400).send('Uh oh, there\'s an error adding friend');
      });
   }
});

app.get('/logout', function(req, res) {
  console.log('logging out');
  req.logout();
  console.log('new session object: ', req.session);
  res.status(200).send('successfully logged out');
});

app.post('/games', function(req, res) {
  var gameInstance = req.body;
  console.log('Games post req', req.body);
  console.log('Game Instance: ', gameInstance);

  helpers.addPrompts(gameInstance);

  Game.create(gameInstance, function(err) {
    if (err) {
      res.status(400).send(err);
    } else {
      getAllGames((games) => {
        console.log('Sending games to lobby');
        io.to('lobby').emit('update games', {games: games})
        res.status(201).send('success creating game in db');
      });
    }
  });
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
  // Make request to db to get this user's friends
  UserQueries.selectUserByName(user)
    .then(({username, friendList}) => {
      console.log('Results', username, friendList);
      res.status(200).send({username, friendList});
    })
});


var server = app.listen(port, function() {
  console.log('App is listening on port: ', port);
});

// SOCKETS
var io = require('socket.io')(server);


const Games = {};
const Sockets = {};
const Rooms = {};
let userSockets = {};

// FIX: Covert to one object
// {
//   'craig': {
//     socketId: 1231231,
//     room: 'lobby'
//   }
// }
// Overwrite socketId on reconnect

const allUsers = {};
const allConnectedUsers = {};
const connectedLobbyUsers = {};
let lobbyUsers = [];
let lobbyChatMessages = [];

var getAllGames = function(callback) {
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

    callback(sortedGames);
  })

}


io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // DISCONNECT OR LOGOUT
  socket.on('disconnect', data => {
    console.log(`Someone disconnected! ${socket.id}`);

    for (let user in allUsers) {
      if (allUsers[user].socketId === socket.id) {
        delete allUsers[user];
      }
    }

    io.emit('ALL_USERS_UPDATED', allUsers);
  })

  // LOBBY
  socket.on('join lobby', data => {
    var username = data.username;

    // Overwrite if same user connected from a new socket
    if (allUsers[username]) {
      Object.assign(allUsers[username], {socketId: socket.id, room: 'lobby'});
    } else {
      allUsers[username] = {socketId: socket.id, room: 'lobby'};
    }

    allConnectedUsers[username] = connectedLobbyUsers[username] = socket.id;

    socket.join('lobby', console.log(`${username} has joined the lobby!`));

    lobbyUsers = Object.keys(connectedLobbyUsers);

    // Send current chat messages to any socket in the room
    io.to('lobby').emit('chat updated', lobbyChatMessages, console.log('Lobby users: ', lobbyUsers));
    io.to('lobby').emit('user joined lobby', lobbyUsers);
    io.emit('ALL_USERS_UPDATED', allUsers);

    getAllGames((games) => {
      console.log('Sending games to user');
      io.to(socket.id).emit('get games', {games: games})
    });
  });

  socket.on('leave lobby', data => {
    console.log(`${data.username} left the lobby!`);
    socket.leave('lobby');

    delete connectedLobbyUsers[data.username];
    delete allUsers[data.username];

    lobbyUsers = Object.keys(connectedLobbyUsers)
    console.log('lobby users is now: ', lobbyUsers, allUsers);
    io.emit('ALL_USERS_UPDATED', allUsers);
    io.to('lobby').emit('user joined lobby', lobbyUsers);
  });

  socket.on('message', (data) => {
    lobbyChatMessages.push(data);
    io.to('lobby').emit('chat updated', lobbyChatMessages);
  });

  // CHATS
  socket.on('game chat', data => {
    let gameName = data.gameName;
    let chat = Games[gameName].chat;
    chat.push(data);
    io.to(gameName).emit('game chat updated', chat);
  })

  // GAMES
  socket.on('join game', function(data) {
    // data needs to be gamename and username
    var { username, gameName } = data;

    console.log(`${username} is joining room: ${gameName}`);
    socket.join(gameName);
    allUsers[username] = Object.assign({room: gameName});
    io.emit('ALL_USERS_UPDATED', allUsers);

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
      var { players, gameStage } = game.value;
      console.log('DATA!', players.length, gameStage);

      Games[gameName] = {
        time: null,
        timer: null,
        chat: []
      }

      io.to(gameName).emit('game chat updated', Games[gameName].chat);

      if (players.length === 4 && gameStage === 'waiting') {
        queries.setGameInstanceGameStageToPlaying(gameName)
          .then(game => {
            console.log('Starting game: ', game.value)
            getAllGames((games) => {
              console.log('Sending games to individual socket join game start');
              io.to('lobby').emit('update games', {games: games})
            });
            var dummyGameRoom = Object.assign({},game.value,{gameStage:'waiting'});
            io.to(gameName).emit('update waiting room', dummyGameRoom);
/*************************************************************
LOGIC TO CREATE COUNTDOWN BEFORE GAME STARTS
**************************************************************/
            Games[gameName].time = 5;
            Games[gameName].timer = setInterval( () => {
              io.to(gameName).emit('timer',{time: Games[gameName].time--})
              if (Games[gameName].time < 0) {
                console.log('Game Starting!');
                clearInterval(Games[gameName].timer)
                setTimeout( () => {
                  io.to(gameName).emit('timer',{time: null})
                  io.to(gameName).emit('start game', game.value)
                }, 1500)
              }
            }, 1000)
          });
      } else {
        console.log('Joining Game: ', game.value);
        io.to(gameName).emit('update waiting room', game.value);
        getAllGames((games) => {
          console.log('Sending games to individual socket');
          io.to('lobby').emit('update games', {games: games})
        });
      }
    })
    .catch(error => console.log(error))
  });

/****************************************************************************************************************************

ROUND STARTING TIMER

****************************************************************************************************************************/
  socket.on('round started', (data) => {
    var { gameName, username } = data;
    console.log('round starts!', data);
    clearInterval(Games[gameName].timer);
    console.log(Games[gameName])
    Games[gameName] = Object.assign(Games[gameName], {time: 15, timer: null});
    Games[gameName].timer = setInterval( () => {
      // io.to(gameName).emit('timer', {time: Games[gameName].time--})
      io.to(gameName).emit('timer', {time: Games[gameName].time--})
      console.log(Games[gameName].time);
      if (Games[gameName].time < 0){
        io.to(gameName).emit('timer', {time: null})
        clearInterval(Games[gameName].timer)
        queries.retrieveGameInstance(gameName)
        .then(function(game) {
          var currentRound = game.currentRound;
          var currentResponses = game.rounds[currentRound].responses;
          var currentRounds = game.rounds;
          currentRounds[currentRound].stage++;
          return queries.updateRounds(gameName, currentRounds)
          .then(function() {
            return queries.retrieveGameInstance(gameName)
            .then(function(game) {
              io.to(gameName).emit('start judging', game);
              console.log('game');
            })
          })
        }).catch(function(error) {
          console.log(error);
          throw error;
        })
      }
    }, 1000)
  })

/****************************************************************************************************************************

ROUND STARTING TIMER

****************************************************************************************************************************/

  socket.on('leave game', (data) => {
    var { username, gameName } = data;

    queries.retrieveGameInstance(gameName)
      .then(game => {
        if (game.players.includes(username)) {
          var currentPlayers = game.players.filter(player => player !== username);

          return queries.removePlayerFromGameInstance(gameName, username);
        } else {
          console.log('Error, username not found');
          return 'Error';
        }
      })
      .then(game => {
        console.log('players in game destroyed ', game.value.players.length);
        if (game.value.players.length > 0) {
          io.to(gameName).emit('update waiting room', game.value)
          getAllGames((games) => {

            console.log(`${username} is leaving room: ${gameName}`);
            socket.leave(gameName);
            console.log('Sending games to individual socket');
            io.to(socket.id).emit('get games', {games: games})
          });
        } else {
          // If number of players is now zero then destroy that room
          queries.destroyGameInstance(gameName)
            .then(
              getAllGames(games => {
                console.log(`${username} is leaving room: ${gameName}`);
                socket.leave(gameName);
                console.log('Sending games to lobby');
                io.to('lobby').emit('update games', {games: games})
              })
            )
            .catch(err => console.log(err));
        }

        // console.log(`${username} is leaving room: ${gameName}`);
        // socket.leave(gameName);
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
    console.log('Received response', data);
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
          clearInterval(Games[gameName].timer);
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

  socket.on('judging timer', data => {
    var {gameName} = data;
    var winner = ''
    clearInterval(Games[gameName].timer);
    Games[gameName] = Object.assign(Games[gameName], {time: 10, timer: null});
    Games[gameName].timer = setInterval( () => {
      io.to(gameName).emit('timer', {time: Games[gameName].time--})
      if (Games[gameName].time < 0) {
        clearInterval(Games[gameName].timer)
        queries.retrieveGameInstance(gameName)
        .then(function (game) {
          var currentRound = game.currentRound;
          var currentResponses = game.rounds[currentRound].responses;
          var Rounds = game.rounds.slice(0);
          Rounds[currentRound].winner = winner;
          Rounds[currentRound].stage++;
          queries.updateRounds(gameName, Rounds)

/*****************************************************************************************
COPYING JUDGE SELECTION CODE HERE
*****************************************************************************************/
          .then(function () {
            queries.retrieveGameInstance(gameName)
            .then(function (game) {
                if (game.currentRound < 3) {
                  io.to(gameName).emit('winner chosen', game);
    /**************************************************************************************************
    LOGIC FOR WINNERS DISPLAY PAGE
    **************************************************************************************************/
                  clearInterval(Games[gameName].timer)
                  Games[gameName] = Object.assign(Games[gameName], {time: 10, timer: null});
                  Games[gameName].timer = setInterval( () => {
                    io.to(gameName).emit('timer',{time: Games[gameName].time--})
                    if (Games[gameName].time < 0) {
                      clearInterval(Games[gameName].timer)
                      queries.retrieveGameInstance(gameName)
                      .then(game => {
                        console.log('Ready to move on game data: ', game);
                        var currentRound = game.currentRound;
                        var Rounds = game.rounds.slice(0);
                          queries.updateRounds(gameName, Rounds)
                          .then(function() {
                            currentRound++;
                            queries.updateCurrentRound(gameName, currentRound)
                            .then(function() {
                              queries.retrieveGameInstance(gameName)
                              .then(function(game) {
                                io.to(gameName).emit('timer',{time: null})
                                io.to(gameName).emit('start next round', game);
                              })
                            })
                          })
                      }).catch(function(error) {
                        console.log(error);
                        throw error;
                      })
                    }
                  }, 1000)
    /**************************************************************************************************
    LOGIC FOR WINNERS DISPLAY PAGE - WORKS!
    **************************************************************************************************/
                } else {
                  queries.setGameInstanceGameStageToGameOver(gameName).then(function () {
                    clearInterval(Games[gameName].timer)
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

/*****************************************************************************************
*****************************************************************************************/
      }
    }, 1000)
  })

  socket.on('judge selection', (data) => {
    var gameName = data.gameName;
    var winner = data.winner;
    io.to(gameName).emit('timer', {time: null})
    clearInterval(Games[gameName].timer)
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
/**************************************************************************************************
LOGIC FOR WINNERS DISPLAY PAGE
**************************************************************************************************/
              clearInterval(Games[gameName].timer)
              Games[gameName] = Object.assign(Games[gameName], {time: 10, timer: null});
              Games[gameName].timer = setInterval( () => {
                io.to(gameName).emit('timer',{time: Games[gameName].time--})
                if (Games[gameName].time < 0) {
                  clearInterval(Games[gameName].timer)
                  queries.retrieveGameInstance(gameName)
                  .then(game => {
                    console.log('Ready to move on game data: ', game);
                    var currentRound = game.currentRound;
                    var Rounds = game.rounds.slice(0);
                      queries.updateRounds(gameName, Rounds)
                      .then(function() {
                        currentRound++;
                        queries.updateCurrentRound(gameName, currentRound)
                        .then(function() {
                          queries.retrieveGameInstance(gameName)
                          .then(function(game) {
                            io.to(gameName).emit('timer',{time: null})
                            io.to(gameName).emit('start next round', game);
                          })
                        })
                      })
                  }).catch(function(error) {
                    console.log(error);
                    throw error;
                  })
                }
              }, 1000)
/**************************************************************************************************
LOGIC FOR WINNERS DISPLAY PAGE - WORKS!
**************************************************************************************************/
            } else {
              queries.setGameInstanceGameStageToGameOver(gameName).then(function () {
                clearInterval(Games[gameName].timer)
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
});
