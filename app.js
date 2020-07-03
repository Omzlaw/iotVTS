require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-find-or-create");

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "my little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://<yourMongoDB>projectname:<yourPassword>@cluster0-hgsfo.mongodb.net/<yourCollectionName>", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

const firebase = require('firebase-admin');
const serviceAccount = require("./yourfirebaseProjectJsonfile.json"); //Get your Json file from firebase and insert in the root directory of project. Firebase's Realtime database was used
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://yourFirebaseProjectNamefirebaseio.com",
});
const db = firebase.database();
let ref = db.ref("test/testConditions");
let refImage = db.ref("test");
let email;

function refsToRun() {
  ref.on("value", function(snapshot) {
    statistics = snapshot.val();
    io.emit('data', statistics);
  }, function(errorObject) {
    console.log("The read failed: " + errorObject.code);
  });

  ref.on("value", function(snapshot) {
    locationData = [snapshot.val().Location_lat, snapshot.val().Location_long];
    io.emit('map', locationData);
  }, function(errorObject) {
    console.log("The read failed: " + errorObject.code);
  });

  refImage.on("value", function(snapshot) {
    const image = [snapshot.val().Photo_capture0, snapshot.val().Photo_capture1, snapshot.val().Photo_capture2,
      snapshot.val().Photo_capture3, snapshot.val().Photo_capture4, snapshot.val().Photo_capture5, snapshot.val().Photo_capture6,
      snapshot.val().Photo_capture7, snapshot.val().Photo_capture8, snapshot.val().Photo_capture9
    ];
    io.on('connection', function(socket) {

      socket.emit('image', image);
    });
  });

}

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, ///create a .env file in the root of the project and add your google oauth client_id and client_secret
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://yourProjectSite/auth/google/yourProjectNameforGoogleoAuth",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  
  function(accessToken, refreshToken, profile, cb) {
    email = profile._json.email;
    const emailref = email.slice(0, email.indexOf("."));

    ref = db.ref(emailref + "/vehicleConditions");
    refImage = db.ref(emailref);
    ref.once("value", function(snapshot) {
      if(snapshot.val()) {
        refsToRun();
        User.findOrCreate({
          googleId: profile.id
        }, function(err, user) {
          return cb(err, user);
        });
      }
      else {
        ref = db.ref("test/testConditions");
        refImage = db.ref("test");
        refsToRun();
        User.findOrCreate({
          googleId: profile.id
        }, function(err, user) {
          return cb(err, user);
        });
      }
    });

  }
));

app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("vehiclestats", {
      email: email
    });
  } else {
    res.render("home");
  }
});

app.get("/login", function(req, res) {
  res.render("login");
});

//Change auth/google GET URL to your own

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

//Change auth/google GET URL to your own

app.get("/auth/google/IoTVTS",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/vehiclestats');
  });

// app.get("/register", function(req, res) {
//   res.render("register");
// });

app.get("/vehiclestats", function(req, res) {
  if (req.isAuthenticated()) {
    ref.once("value", function(snapshot) {
      statistics = snapshot.val();
      io.on('connection', function(socket) {
        socket.emit('data', statistics)
      });
      res.render("vehiclestats", {
        email: email
      });
    }, function(errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  } else {
    res.redirect("/login");
  }

});



app.get("/map", function(req, res) {
  if (req.isAuthenticated()) {
    ref.once("value", function(snapshot) {
      locationData = [snapshot.val().Location_lat, snapshot.val().Location_long];
      io.on('connection', function(socket) {
        socket.emit('map', locationData); // emit an event to the socket
      });
      res.render("maps");
    }, function(errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  } else {
    res.redirect("/login");
  }
});



app.get("/captureImage", function(req, res) {
  if (req.isAuthenticated()) {
    refImage.once("value", function(snapshot) {
      condition = snapshot.val().Capture_image;
      if (condition == "No") {
        refImage.update({
          Capture_image: "Yes"
        });
      }
      refImage.once("value", function(snapshot) {
        if (condition == "No") {
          const image = [snapshot.val().Photo_capture0, snapshot.val().Photo_capture1, snapshot.val().Photo_capture2,
            snapshot.val().Photo_capture3, snapshot.val().Photo_capture4, snapshot.val().Photo_capture5, snapshot.val().Photo_capture6,
            snapshot.val().Photo_capture7, snapshot.val().Photo_capture8, snapshot.val().Photo_capture9
          ];
          io.on('connection', function(socket) {
            socket.emit('image', image);
          });
        }
      });
    }, function(errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
    res.redirect("/image");
  } else {
    res.redirect("/login");
  }

});


app.get("/image", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("image");
  } else {
    res.redirect("/login");
  }
});

app.get("/engineControl", function(req, res) {
  if (req.isAuthenticated()) {
    ref.once("value", function(snapshot) {
      condition = snapshot.val().Engine_state;
      if (condition == "Off") {
        ref.update({
          Engine_state: "On"
        });
      } else {
        ref.update({
          Engine_state: "Off"
        });
      }
    }, function(errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
    res.redirect("/vehiclestats");
  } else {
    res.redirect("/login");
  }

});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/engineConfirm", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("engineConfirm");
  } else {
    res.redirect("/login");
  }

});

app.get("/doorControl", function(req, res) {
  if (req.isAuthenticated()) {
    ref.once("value", function(snapshot) {
      condition = snapshot.val().Door_state;
      if (condition == "Closed") {
        ref.update({
          Door_state: "Open"
        });
      } else {
        ref.update({
          Door_state: "Closed"
        });
      }
    }, function(errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
    res.redirect("/vehiclestats");
  } else {
    res.redirect("/login");
  }
});

app.get("/doorConfirm", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("doorConfirm");
  } else {
    res.redirect("/login");
  }
});

// app.get("/3dview", function(req, res) {
//   if (req.isAuthenticated()) {
//     ref.once("value", function(snapshot) {
//       conditions = [snapshot.val().MPU_data];
//       io.on('connection', function(socket) {
//         socket.emit('MPUData', conditions); // emit an event to the socket
//       });
//       res.render("3dview");
//     }, function(errorObject) {
//       console.log("The read failed: " + errorObject.code);
//     });
//   } else {
//     res.redirect("/login");
//   }
// });
//
// ref.on("value", function(snapshot) {
//   conditions = [snapshot.val().MPU_data];
//   io.emit('MPUData', conditions);
// }, function(errorObject) {
//   console.log("The read failed: " + errorObject.code);
// });

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


http.listen(port, function() {
  console.log("Server has started Successfully");
});
