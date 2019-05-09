var mongoose = require("mongoose");

var semesterSchema = new mongoose.Schema({
    name: {type: String, unique: true, required: true},
    desc: String,
    startDate: Date,
    endDate: Date,
    Program: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Program"
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("Semester", semesterSchema);

