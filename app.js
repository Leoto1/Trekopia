var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var express = require("express");
var path = require('path');
var app = express();
var Comment = require('./models/Comment.js');
var Trek= require('./models/Trek.js')


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/Trekopia", { useNewUrlParser: true });


app.get("/", function (req, res) {
    res.render("index");
});

app.get("/treks", function (req, res) {
    Trek.find({}, function (err, allTrek) {
        if (err) {
            console.log(err);
        } else {
            res.render("trek/treks", { treks: allTrek });
        }
    });
});

app.post("/treks", function (req, res) {
    var newTrek = req.body.trek;

    Trek.create(newTrek, function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/treks");
        }
    });
});

app.get("/treks/new", function (req, res) {
    res.render("trek/new");
});

app.get("/treks/:id", function (req, res) {
    Trek.findById(req.params.id).populate("comments").exec(function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            res.render("trek/show", { trek: foundTrek });
        }
    });
});
app.post("/treks/:id/comments", function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            Comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    console.log(err);
                } else {
                    foundTrek.comments.push(comment);
                    foundTrek.save();
                    res.redirect("/treks/" + foundTrek._id);
                }
            });
        }
    });
});


app.listen(8080,'192.168.1.102' ||'localhost', function () {
    console.log("Trekopia has started");
});