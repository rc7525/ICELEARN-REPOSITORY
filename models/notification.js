var mongoose             = require("mongoose");

var notificationSchema = new mongoose.Schema({
    email: String,
    schoolId: String,
    schoolName: String,
    announcementId: String,
    announcementName: String,
    isRead: {type: Boolean, default:false}
});    

//To export the model
module.exports = mongoose.model("Notification", notificationSchema);