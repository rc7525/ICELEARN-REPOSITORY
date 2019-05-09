var mongoose = require("mongoose");

var sequenceSchema = new mongoose.Schema({
    nextSeqNumber: { type: Number, default: 1 }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});    

//To export the model
module.exports = mongoose.model("Sequence", sequenceSchema);
