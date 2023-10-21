require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const crypto = require("crypto");
const favicon = require("serve-favicon");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const session = require("cookie-session");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const flash = require("req-flash");

mongoose
	.connect(process.env.DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch((error) => console.error(error));

const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: "Too many requests from this IP, please try again after a minute",
});

app.use("/shorten", apiLimiter);
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: true,
	})
);
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(flash());

//Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	User.findById(id, (err, user) => {
		done(err, user);
	});
});

passport.use(
	new localStrategy(
		{ usernameField: "email", passwordField: "password" },
		(email, password, done) => {
			User.findOne({ email }, (err, user) => {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, {
						message: "This email is does not exist",
					});
				}

				bcrypt.compare(password, user.password, (err, res) => {
					if (err) {
						return done(err);
					}

					if (res === false) {
						return done(null, false, {
							message: "Incorrect password",
						});
					}

					return done(null, user);
				});
			});
		}
	)
);

app.set("view engine", "ejs");
app.set("views", "./views");

// Comment
require("./routes")(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));
