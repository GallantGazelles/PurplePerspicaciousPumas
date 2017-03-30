var models = require('./index.js');
var games = models.db.collection('gameinstancemodels');

module.exports.retrieveGameInstance = function(gameName) {

  return games.findOne({gameName: gameName});
};

module.exports.destroyGameInstance = function(gameName) {

  return games.deleteOne({gameName: gameName});
};

module.exports.addPlayerToGameInstance = function(gameName, username) {

  return games.findOneAndUpdate({gameName: gameName}, {$push: {players: username}}, {returnOriginal: false});
  // return games.update({gameName: gameName}, {$push: {players: username} });
};

module.exports.removePlayerFromGameInstance = function(gameName, username) {

  return games.findOneAndUpdate({gameName: gameName}, {$pull: {players: username}}, {returnOriginal: false});
};

module.exports.setGameInstanceGameStageToPlaying = function(gameName) {

  return games.findOneAndUpdate({gameName: gameName}, {$set: {gameStage: 'playing'}}, {returnOriginal: false});
};

module.exports.updateRounds = function(gameName, roundsArray) {

  return games.update({gameName: gameName}, { $set: {rounds: roundsArray} });
};

module.exports.updateCurrentRound = function(gameName, round) {

  return games.update({gameName: gameName}, { $set: {currentRound: round} });
}

module.exports.setGameInstanceGameStageToGameOver = function(gameName) {

  return games.update({gameName: gameName}, { $set: {gameStage: 'gameover'} });
};