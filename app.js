var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var express = require("express");
var sessions = require("client-sessions");
var bcrypt= require('bcryptjs');
var methodOverride = require("method-override");
var app = express();

app.use(methodOverride("_method"));

app.use(sessions({
    cookieName:"session",
    secret:"shh-its-a-secret",
    duration:30*60*1000,
    httpOnly:true,
    secure:true
}));

var Comment = require('./models/Comment.js');
var Trek= require('./models/Trek.js')
var User = require('./models/User.js')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/Trekopia", { useNewUrlParser: true });

app.use((req,res,next)=>{
    res.locals.currentUser=null
    if(!(req.session && req.session.userId)){
        return next();
    }
    User.findById(req.session.userId,(err,user)=>{
        if(err){
            return next(err);
        }
        if(!user){
            return next();
        }
        user.password=undefined;
        req.user =user;
        res.locals.currentUser=user;
        next();
    });
});

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

app.post("/treks", loginRequired, function (req, res) {
    req.body.trek.author=req.user;
    var newTrek = req.body.trek;

    Trek.create(newTrek, function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/treks");
        }
    });
});

app.get("/treks/new", loginRequired, function (req, res) {
    res.render("trek/new");
});

app.get("/treks/:id", function (req, res) {
    Trek.findById(req.params.id).populate("author").populate("comments").exec(function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            res.render("trek/show", { trek: foundTrek });
        }
    });
});
app.post("/treks/:id/comments", loginRequired, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            req.body.comment.author={};
            req.body.comment.author.id = req.user;
            req.body.comment.author.name=req.user.firstName+" "+req.user.lastName;
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



app.get("/treks/:id/edit",isTrekOwned,function(req,res){
    Trek.findById(req.params.id,function(err,foundTrek){
            res.render("trek/edit",{trek:foundTrek});
    });
});

app.put("/treks/:id",isTrekOwned,function(req,res){
        Trek.findByIdAndUpdate(req.params.id,req.body.trek,function(err,trek){
        if(err){
            console.log(err);
        }else{
            res.redirect("/treks/"+trek._id);
        }
    });
});

app.delete("/treks/:id", isTrekOwned,function(req,res){
        Trek.findByIdAndDelete(req.params.id,function(err,trek){
        if(err)
        {
            console.log(err);
        }else{
            res.redirect("/treks");
        }
    });
});

app.get("/treks/:id/comments/:comment_id/edit", isCommentOwned, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            res.redirect("back");
        } else {
            Comment.findById(req.params.comment_id, function (err, foundComment) {
                if (err) {
                    res.redirect("back");
                } else {
                    res.render("comment/edit", { trek: foundTrek, comment: foundComment });
                }
            });
        }
    });
});
app.put("/treks/:id/comments/:comment_id", isCommentOwned, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, foundComment) {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect("/treks/" + foundTrek._id);
                }
            });
        }
    });
});

app.delete("/treks/:id/comments/:comment_id", isCommentOwned, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            Comment.findByIdAndDelete(req.params.comment_id, function (err, foundComment) {
                if (err) {
                    console.log(err);
                } else {
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
    let hash = bcrypt.hashSync(req.body.user.password, 14);
    req.body.user.password = hash;
    User.create(req.body.user, (err, user) => {
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

app.get("/login", function (req, res) {
    res.render('login');
});

app.post("/login", (req, res) => {
    User.findOne({ email: req.body.user.email }, (err, user) => {
        if (err || !user || !bcrypt.compareSync(req.body.user.password, user.password)) {
            return res.render("login", {
                error: "Incorrect email / password."
            });
        }
        req.session.userId = user._id;
        res.redirect("/treks");
    });
});

app.get("/logout", (req, res) => {
    req.session.userId = null;
    req.user = null;
    res.redirect("/");
});

function isCommentOwned(req, res, next) {
    if (req.user) {
        Trek.findById(req.params.id, function (err, foundTrek) {
            if (err) {
                res.redirect("back");
            } else {
                Comment.findById(req.params.comment_id, function (err, foundComment) {
                    if (err) {
                        res.redirect("back");
                    } else {
                        if (foundComment.author.id.equals(req.user._id)) {
                            next();
                        } else if (foundTrek.author.equals(req.user._id)) {
                            next();
                        } else {
                            res.redirect("back");
                        }
                    }
                });
            }
        });
    } else {
        res.redirect("/login");
    }
}

function isTrekOwned(req, res, next) {
    if (req.user) {
        Trek.findById(req.params.id, function (err, foundTrek) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundTrek.author.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("/login");
    }
}

function loginRequired(req,res,next){
    if(!req.user){
        return res.redirect("/login");
    }
    next();
}


app.listen(8080, function () {
    console.log("Trekopia has started");
});