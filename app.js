var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var express = require("express");
var sessions = require("client-sessions");
var app = express();

app.use(sessions({
    cookieName:"session",
    secret:"shh-its-a-secret",
    duration:30*60*1000,
}));

var Comment = require('./models/Comment.js');
var Trek= require('./models/Trek.js')
var User = require('./models/User.js')

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

app.get("/register", function (req, res) {
    res.render('register');
});

app.post("/register", (req, res) => {
    User.create(req.body.user,(err) => {
        if (err) {
            let error = "Something bad happened! Please try again.";
            if (err.code === 11000) {
                error = "That email is already taken, please try another.";
            }
            return res.render("register", { error: error });
        }
        req.session.userId = user._id;
        res.redirect("/treks");
    });
});


app.get("/login",function(req,res){
    res.render('login');
})
app.post("/login", (req, res) => {
    User.findOne({ email: req.body.user.email }, (err, user) => {
        if (err || !user || req.body.user.password !== user.password) {
            return res.render("login", {
                error: "Incorrect email / password."
            });
        }
        req.session.userId = user._id;
        console.log(req.session);
        res.redirect("/treks");
    });
});



app.listen(8080, function () {
    console.log("Trekopia has started");
});