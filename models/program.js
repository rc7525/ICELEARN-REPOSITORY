var mongoose = require("mongoose");

var programSchema = new mongoose.Schema({
    name: {type: String, unique: true, required: true},
    desc: String,
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School"
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("Program", programSchema);

