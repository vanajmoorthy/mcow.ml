const shortModel = require("./models/short");
const fetch = require("node-fetch");
const passport = require("passport");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const isEmpty = (str) => {
	return !str.trim().length;
};

const isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
};

const isLoggedOut = (req, res, next) => {
	if (!req.isAuthenticated()) {
		return next();
	}
	res.redirect("/");
};

const isPasswordValid = (pass) => {
	return pass.length >= 5;
};

module.exports = (app) => {
	app.get("/", (req, res) => {
		let hasUrlBeenShortened = false;
		let doErrorsExist = false;
		let errors = "";
		let shortenedURL = "";
		let shortened = "";

		// Check if the user is authenticated
		let isUserAuthenticated = req.isAuthenticated() || false;

		console.log("auth" + isUserAuthenticated);

		res.render("index", {
			doErrorsExist,
			errors,
			hasUrlBeenShortened,
			shortenedURL,
			shortened,
			isUserAuthenticated, // Make sure to include isUserAuthenticated in the object you pass to res.render
		});
	});

	app.get("/signup", (req, res) => {
		let error = "";

		res.render("signup", { error: error });
	});

	app.post("/signup", async (req, res) => {
		const exists = await User.exists({ email: req.body.email });

		let error = "";

		if (exists) {
			error = "Sorry, that email address is taken.";
			res.render("signup", { error: error });
			return;
		}

		if (!isPasswordValid(req.body.password)) {
			error =
				"Please make sure your password is longer than 5 characters.";
			res.render("signup", { error: error });
			return;
		}

		bcrypt.genSalt(10, (err, salt) => {
			if (err) return next(err);
			bcrypt.hash(req.body.password, salt, (err, hash) => {
				if (err) return next(err);

				const newUser = new User({
					email: req.body.email,
					password: hash,
				});

				newUser.save();
			});
		});

		res.redirect("/");
	});

	app.get("/profile", isLoggedIn, async (req, res) => {
		const usersLinks = await shortModel.find({ user: req.user });
		const userEmail = req.user.email;

		res.render("profile", { email: userEmail, links: usersLinks });
	});

	app.post(
		"/login",
		isLoggedOut,
		passport.authenticate("local", {
			successRedirect: "/",
			failureRedirect: "/login",
			failureFlash: true,
		}),
		function (req, res) {
			// You can add custom handling here if needed
		}
	);

	app.get("/login", (req, res) => {
		console.log(req.flash("error"));
		console.log("logg")
		res.render("login", { error: req.flash("error") });
	});

	app.get("/logout", (req, res) => {
		req.logout();
		res.redirect("/");
	});

	// Setup admin
	app.get("/setup", async (req, res) => {
		const exists = await User.exists({ email: "admin@admin.com" });

		if (exists) {
			res.redirect("/login");
			return;
		}

		bcrypt.genSalt(10, function (err, salt) {
			if (err) return next(err);
			bcrypt.hash("pass", salt, function (err, hash) {
				if (err) return next(err);

				const newAdmin = new User({
					email: "admin@admin.com",
					password: hash,
				});

				newAdmin.save();

				res.redirect("/login");
			});
		});
	});

	app.get("/stats/:slug", async (req, res) => {
		const slug = await shortModel.findOne({ short: req.params.slug });
		let slugExists = slug != null;
		let clicks;
		slugExists ? (clicks = slug.clicks) : (clicks = null);

		console.log(clicks);
		res.render("stats", { slugExists, clicks });
	});

	// Post to actually shorten url
	// TO-DO: Refactor
	app.post("/shorten", async (req, res) => {
		let doErrorsExist = false;
		let errors = "";

		const long = req.body.long;
		const short =
			req.body.short === "" ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short)
				? crypto
					.createHash("sha256")
					.update(long)
					.digest("hex")
					.substring(0, 7)
				: req.body.short;
		const type =
			req.body.short === "" ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short)
				? "generated"
				: "manual";

		let shortURLtoLookUp = await shortModel.findOne({
			long,
			short,
		});

		let onlyShortToLookUp = await shortModel.findOne({
			short,
			type,
		});

		if (onlyShortToLookUp && onlyShortToLookUp.type == "manual") {
			doErrorsExist = true;
			errors = "Sorry, that short URL already exists!";
			console.log("short URL exists");
		} else if (shortURLtoLookUp) {
			console.log(shortURLtoLookUp);
		} else {
			let date = Date.now();
			if (req.isAuthenticated()) {
				let user = req.user.id;
				await shortModel.create({
					long,
					short,
					type,
					date,
					user,
				});
				console.log(long, short, type, date, user);
			} else {
				await shortModel.create({ long, short, type, date });
				console.log(long, short, type, date);
			}
		}

		let hasUrlBeenShortened = true;
		let shortenedURL = `${req.protocol}://${req.get("host")}${req.originalUrl}${short}`;
		console.log(shortenedURL);

		let shortened = `mcow.ml/${short}`;
		let isUserAuthenticated = req.isAuthenticated() || false;

		res.render("index", {
			doErrorsExist,
			errors,
			hasUrlBeenShortened,
			shortenedURL,
			shortened,
			isUserAuthenticated,
		});
	});


	app.get("/:slug", async (req, res) => {
		try {
			var shortUrl = await shortModel.findOne({ short: req.params.slug });
		} catch (err) {
			console.error(err);
		}

		if (shortUrl == null) return res.render("404");

		shortUrl.clicks++;
		shortUrl.save();

		console.log(shortUrl.clicks);
		console.log(`Redirecting to ${shortUrl.long}`);
		res.status(301).redirect(shortUrl.long);
	});
};
