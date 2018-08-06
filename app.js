var bodyParser = require("body-parser");
var mongoose = require("mongoose")
var express = require("express");
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost/Trekopia")


var trekSchema = new mongoose.Schema({
    name: String,
    cost:Number,
    location:String,
    days:Number,
    bestTime:String,
    images:[String],
    description: String
});

var Trek = mongoose.model("Trek", trekSchema);

app.get("/", function (req, res) {
    res.render("index");
});

app.get("/treks", function (req, res) {
    Trek.find({}, function (err, allTrek) {
        if (err) {
            console.log(err);
        } else {
            res.render("treks", { treks: allTreks });
        }
    });
});

app.post("/treks", function (req, res) {
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
    var newTrek = { name: name, image: image, description: desc };

    Trek.create(newTrek, function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/treks");
        }
    });
});

app.get("/treks/new", function (req, res) {
    res.render("new");
});

app.get("/treks/:id", function (req, res) {
    Trek.findById(req.params.id, function (err, foundTrek) {
        if (err) {
            console.log(err);
        } else {
            console.log(foundtrek)
            res.render("show", { trek: foundTrek });
        }
    });
});

app.listen(8080, function () {
    console.log("Yelpcamp has started");
});