var mongoose              = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var schoolSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    email: {type: String, unique: true, required: true},
    name: String,
    address_1: String,
    address_2: String,
    city: String,
    state: String,
    zip: String,
    phone_number: String,
    desc: String,
    image: String,
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    programs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program"
        }
    ],
    rating: {
        type: Number,
        default: 0
    }
}, {
    // if timestamps are set to true, mongoose assigns createdAt and updatedAt fields to your schema, the type assigned is Date.
    timestamps: true
});    

//Adds the methods that comes with passport-local-mongoose to the SchoolSchema
schoolSchema.plugin(passportLocalMongoose);

//To export the model
module.exports = mongoose.model("School", schoolSchema);
