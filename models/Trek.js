var mongoose = require('mongoose');

var trekSchema = new mongoose.Schema({
    name: String,
    cost: Number,
    location: String,
    days: Number,
    bestTime: String,
    images: String,
    lat:Number,
    lon:Number,
    description: String,
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

});

module.exports = mongoose.model("Trek", trekSchema);