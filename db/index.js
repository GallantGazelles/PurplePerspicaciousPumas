var mongoose = require('mongoose');
var mongodbURL = process.env.MONGODB_URI || 'mongodb://legacy:legacy@ds111940.mlab.com:11940/gg-legacy-dev';

mongoose.connect(mongodbURL);
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');
var dummyGames = require('./dummy-data');
var dummyGamePlayThrough = require('./game-playthrough-dummy-data.js')

var db = mongoose.connection;

db.on('error', function() {
  console.log('mongoose connection error');
});

db.once('open', function() {
  console.log('mongoose connected successfully');
  console.log(typeof dummyGamePlayThrough);
});

var gameInstanceSchema = new Schema({
  id: Number,
  gameName: {type: String, unique: true },
  password: String,
  players: Array,
  rounds: Array,
  currentRound: Number,
  gameStage: {type: String, default: 'waiting'}
});

var userSchema = new Schema({
	username: {type: String, unique: true },
	friendList: Array,
	password: String,
	email: String,
});

userSchema.plugin(passportLocalMongoose);

var gameInstanceModel = mongoose.model('gameInstanceModel', gameInstanceSchema);

var userInstanceModel = mongoose.model('userModel', userSchema);

//COMMENT THIS OUT DURING GAME TESTING
//Clearout database
// var gameCollection = db.collection('gameinstancemodels');
// gameCollection.remove({});



// var gameOne = new gameInstanceModel(dummyGames.gameOne)

// gameOne.save(function (err, game) {
// 	if (err) {
// 		console.log('error', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });


// var gameTwo = new gameInstanceModel(dummyGames.gameTwo)

// gameTwo.save(function (err, game) {
// 	if (err) {
// 		console.log('error', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// var gameThree = new gameInstanceModel(dummyGames.gameThree)

// gameThree.save(function (err, game) {
// 	if (err) {
// 		console.log('err', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// var gameFour = new gameInstanceModel(dummyGames.gameFour)

// gameFour.save(function (err, game) {
// 	if (err) {
// 		console.log('err', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// for (let game in dummyGamePlayThrough) {
// 	let newGame = new gameInstanceModel(dummyGamePlayThrough[game]);
// 	newGame.save(function (err, game) {
// 		if (err) {
// 			console.log('err', err);
// 			return
// 		} else {
// 		// console.log('gameAdded', game);
// 		}
// 	});
// }
//Comment this code back in to have access to the dummy data on your local machine
// it was commented out for depoloyment.

//Clearout database
// var collection = db.collection('gameinstancemodels');
// collection.remove({});

// var gameOne = new gameInstanceModel(dummyGames.gameOne)

// gameOne.save(function (err, game) {
// 	if (err) {
// 		console.log('error', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });


// var gameTwo = new gameInstanceModel(dummyGames.gameTwo)

// gameTwo.save(function (err, game) {
// 	if (err) {
// 		console.log('error', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// var gameThree = new gameInstanceModel(dummyGames.gameThree)

// gameThree.save(function (err, game) {
// 	if (err) {
// 		console.log('err', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// var gameFour = new gameInstanceModel(dummyGames.gameFour)

// gameFour.save(function (err, game) {
// 	if (err) {
// 		console.log('err', err);
// 		return
// 	} else {
// 	// console.log('gameAdded', game);
// 	}
// });

// for (let game in dummyGamePlayThrough) {
// 	let newGame = new gameInstanceModel(dummyGamePlayThrough[game]);
// 	newGame.save(function (err, game) {
// 		if (err) {
// 			console.log('err', err);
// 			return
// 		} else {
// 		// console.log('gameAdded', game);
// 		}
// 	});
// }


module.exports.gameInstanceModel = gameInstanceModel;
module.exports.userModel = userInstanceModel;
module.exports.db = db;