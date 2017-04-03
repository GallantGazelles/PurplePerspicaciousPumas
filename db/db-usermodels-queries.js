var models = require('./index.js');
var users = models.db.collection('usermodels');

module.exports.addFriendToList = function(friend, currentUser) {
	return users.findOneAndUpdate({username: currentUser}, {$addToSet: {friendList: friend}}, {returnOriginal: false});
};

module.exports.selectUserByName = function(username) {
	return users.findOne({username: username})
		.catch((err) => {
			console.log('Error selecting user by name!', err);
		});
};
