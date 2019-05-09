var mongoose = require("mongoose");

var announcementSchema = new mongoose.Schema({
    name: String,
    desc: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        email: String,
        firstName: String,
        lastName: String
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});

module.exports = mongoose.model("Announcement", announcementSchema);

