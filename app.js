var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var express = require("express");
var sessions = require("client-sessions");
var bcrypt= require('bcryptjs');
var methodOverride = require("method-override");
var validator= require("express-validator");
var flash = require("connect-flash");
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
app.use(validator());
app.use(express.static(__dirname + "/public"));
app.use(flash());

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/Trekopia", { useNewUrlParser: true });


app.use((req,res,next)=>{
    res.locals.errors=req.flash("errors");
    res.locals.success = req.flash("success");
    res.locals.currentUser=null;
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
            req.flash("error",["Sorry! we're facing some problem"]);
            res.redirect("/");
        } else {
            res.render("trek/treks", { treks: allTrek });
        }
    });
});

app.post("/treks", loginRequired, function (req, res) {
    var errors = null;
    req.check('trek[name]').notEmpty().withMessage("Please enter the Name");
    req.check('trek[images]').notEmpty().withMessage("Please enter the Images")
    req.check('trek[location]').notEmpty().withMessage("Please enter the Location")
    req.check('trek[cost]', 'Invalid Last Name').notEmpty().withMessage("Please enter the Cost").isNumeric();
    req.check('trek[days]', 'Invalid Last No. of days').notEmpty().withMessage("Please enter the No. of days").isNumeric();
    req.check('trek[bestTime]').notEmpty().withMessage("Please enter the Best Time");
    req.check('trek[description]').notEmpty().withMessage("Please enter the Description")
    var errors = req.validationErrors();
    if (errors) {
        var messages=[];
        errors.forEach(function(error){
            messages.push(error.msg);
        })
        req.flash("errors",messages);
        res.redirect("/trek/new")
    } else {
    
    req.body.trek.author=req.user;
    var newTrek = req.body.trek;

    Trek.create(newTrek, function (err) {
        if (err) {
            req.flash("errors",["There was a problem while creating the post"]);
            res.redirect("/treks/new")
        } else {
            req.flash("success","New post created successfully!")
            res.redirect("/treks");
        }
    });
}
});

app.get("/treks/new", loginRequired, function (req, res) {
    res.render("trek/new");
});

app.get("/treks/:id", function (req, res) {
    Trek.findById(req.params.id).populate("author").populate("comments").exec(function (err, foundTrek) {
        if (err) {
            req.flash("errors",["Sorry! couldn't find the post."]);
            res.redirect("/treks");
        } else {
            res.render("trek/show", { trek: foundTrek });
        }
    });
});

app.post("/treks/:id/comments", loginRequired, function (req, res) {
    req.check('comment[content]', 'Invalid Comment').notEmpty().withMessage("Please enter the Cost").isString();
    var errors = req.validationErrors();
    if(errors){
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        })
        req.flash("errors", messages);
        res.redirect("/trek/"+req.params.id)
        
    }else{
        Trek.findById(req.params.id, function (err, foundTrek) {
            if (err) {
                req.flash("errors", ["Sorry! there was a problem while adding the comment"]);
                res.redirect("/treks");
            } else {
                req.body.comment.author={};
                req.body.comment.author.id = req.user;
                req.body.comment.author.name=req.user.firstName+" "+req.user.lastName;
                Comment.create(req.body.comment, function (err, comment) {
                    if (err) {
                        req.flash("errors", ["Sorry! there was a problem while adding the comment"]);
                        res.redirect("/treks/"+foundTrek._id);
                    } else {
                        foundTrek.comments.push(comment);
                        foundTrek.save();
                        req.flash("success", "Comment added successfully");
                        res.redirect("/treks/" + foundTrek._id);
                    }
                });
            }
        });
    }
});



app.get("/treks/:id/edit",isTrekOwned,function(req,res){
    Trek.findById(req.params.id,function(err,foundTrek){
        if (err) {
            req.flash("errors", ["Sorry! couldn't find the post."]);
            res.redirect("/treks");
        } else {
            res.render("trek/edit",{trek:foundTrek});
        }
    });
});

app.put("/treks/:id",isTrekOwned,function(req,res){
    var errors = null;
    req.check('trek[name]').notEmpty().withMessage("Please enter the Name");
    req.check('trek[images]').notEmpty().withMessage("Please enter the Images")
    req.check('trek[location]').notEmpty().withMessage("Please enter the Location")
    req.check('trek[cost]', 'Invalid Last Name').notEmpty().withMessage("Please enter the Cost").isNumeric();
    req.check('trek[days]', 'Invalid Last No. of days').notEmpty().withMessage("Please enter the No. of days").isNumeric();
    req.check('trek[bestTime]').notEmpty().withMessage("Please enter the Best Time");
    req.check('trek[description]').notEmpty().withMessage("Please enter the Description")
    var errors = req.validationErrors();
    if (errors) {
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        })
        req.flash("errors", messages);
        res.redirect("/trek/new")
    } else {
        Trek.findByIdAndUpdate(req.params.id,req.body.trek,function(err,trek){
        if(err){
            req.flash("errors", ["Sorry! there was problem while updating the post"]);
            res.redirect("/treks");
        }else{
            req.flash("success", "Post updated successfully");
            res.redirect("/treks/"+trek._id);
        }
        });
    }
});

app.delete("/treks/:id", isTrekOwned,function(req,res){
        Trek.findByIdAndDelete(req.params.id,function(err,trek){
        if(err)
        {
            req.flash("errors", ["Sorry! there was problem while deleting the post"]);
            res.redirect("/treks");
        }else{
            req.flash("success", "Post deleted successfully");
            res.redirect("/treks");
        }
    });
});

app.get("/treks/:id/comments/:comment_id/edit", isCommentOwned, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            req.flash("errors", ["Sorry! couldn't find the post."]);
            res.redirect("/treks");
        } else {
            Comment.findById(req.params.comment_id, function (err, foundComment) {
                if (err) {
                    req.flash("errors", ["Sorry! couldn't find the comment."]);
                    res.redirect("/treks/"+foundTrek._id);
                } else {
                    res.render("comment/edit", { trek: foundTrek, comment: foundComment });
                }
            });
        }
    });
});
app.put("/treks/:id/comments/:comment_id", isCommentOwned, function (req, res) {
    req.check('comment[content]', 'Invalid Comment').notEmpty().withMessage("Please enter the Cost").isString();
    if (errors) {
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        })
        req.flash("errors", messages);
        res.redirect("/treks/"+req.params.id+"/comments/"+req.params.comment_id)
    } else {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            req.flash("errors", ["Sorry! couldn't find the post."]);
            res.redirect("/treks");
        } else {
            Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, foundComment) {
                    if (err) {
                        req.flash("errors", ["Sorry! there was problem while updating the comment"]);
                        res.redirect("/treks/" + foundTrek._id);
                    } else {
                        req.flash("success", "Comment updated successfully");
                        res.redirect("/treks/" + foundTrek._id);
                }
            });
        }
        });
    }
});

app.delete("/treks/:id/comments/:comment_id", isCommentOwned, function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            Comment.findByIdAndDelete(req.params.comment_id, function (err, foundComment) {
                if (err) {
                    req.flash("errors", ["Sorry! there was problem while deleting the comment"]);
                    res.redirect("/treks/" + foundTrek._id);
                } else {
                    req.flash("success", "Comment deleted successfully");
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
    var errors = null;
    req.check('user[email]', 'Invalid email address').notEmpty().withMessage("Please enter the Email").isEmail();
    req.check('user[password]').isLength({ min: 4 }).withMessage('must be at least 5 chars long');
    req.check('user[firstName]', 'Invalid First Name').notEmpty().withMessage("Please enter the First Name").isAlpha();
    req.check('user[lastName]', 'Invalid Last Name').notEmpty().withMessage("Please enter the Last Name").isAlpha();
    var errors = req.validationErrors();
    if(errors){
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        })
        req.flash("errors", messages);
        res.redirect("/register")
    }else{
        let hash = bcrypt.hashSync(req.body.user.password, 14);
        req.body.user.password = hash;
        User.create(req.body.user, (err, user) => {
            if (err) {                
                let error = err;
                if (err.code === 11000) {
                    error = ["That email is already taken, please try another."];
                }
                req.flash("errors",error)
                return res.redirect("/register");
            }
            req.session.userId = user._id;
            req.flash("success","You've been successfully registered.")
            res.redirect("/treks");
        });
    }
});

app.get("/login", function (req, res) {
    res.render('login');
});

app.post("/login", (req, res) => {
    User.findOne({ email: req.body.user.email }, (err, user) => {
        if (err || !user || !bcrypt.compareSync(req.body.user.password, user.password)) {
            var messages = [];
            if (!user) {
                messages.push("Invalid Email");
            }else{
                    if(!bcrypt.compareSync(req.body.user.password, user.password)){
                
                        messages.push("Invalid Password");
                    }
            }
            req.flash("errors", messages);
            res.redirect("/login");
            
        }else{
        req.session.userId = user._id;
        req.flash("success","Succesfully logged in.")
        res.redirect("/treks");
        }
    });
});

app.get("/logout", (req, res) => {
    req.session.userId = null;
    req.user = null;
    req.flash("success", "Succesfully logged out.")
    res.redirect("/");
});

app.get("/account/:id",loginRequired, function (req, res) {
    Trek.find({ author: req.params.id }, function (err, foundTreks) {
        if (err) {
            req.flash('errors',"Sorry! there was problem while loading account details.");
            req.redirect("treks");
        } else {
            res.render("account", { treks: foundTreks });
        }

    })
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
        req.flash("errors", ["You need to be logged in to do that!"]);
        return res.redirect("/login");
    }
    next();
}


app.listen(8080, function () {
    console.log("Trekopia has started");
});