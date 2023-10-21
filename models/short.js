const mongoose = require("mongoose");
const User = require("./User").Schema;

const ShortSchema = new mongoose.Schema({
	long: {
		type: String,
		required: true,
	},
	short: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
	},
	clicks: {
		type: Number,
		required: true,
		default: 0,
	},
	date: {
		// Check this
		type: Date,
	},
	user: {
		type: mongoose.Types.ObjectId,
		ref: "User",
	},
});

module.exports = mongoose.model("short", ShortSchema);
