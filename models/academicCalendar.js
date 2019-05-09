var mongoose = require("mongoose");

var academicCalendarSchema = new mongoose.Schema({
    name: String,
    desc: String,
    Program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Program"
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("academicCalendar", academicCalendarSchema);

