var express     = require("express");
var router      = express.Router();
var Announcement  = require("../models/announcement");
var User        = require("../models/user");
var Notification = require("../models/notification");
var validator   = require("express-validator/check");
var methodOverride = require("method-override");
var middleware  = require("../middleware");
var async       = require("async");

require('dotenv').config();

//Method Override
router.use(methodOverride("_method"));

//INDEX ROUTE - get announcements 
router.get("/announcements/index", function(req, res){
    //fuzzy search - req-query will have the search criteria
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    
    if(req.query.search){
        const regExp = new RegExp(escapeRegExp(req.query.search), 'gi');
        Announcement.find({name: regExp}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allAnnouncements) {
            Announcement.count({name: regExp}).exec(function (err, count) {
                if (err){
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(allAnnouncements.length < 1) {
                        req.flash("error", "No Announcements match your search criteria. Please try again.");
                        res.redirect("/announcements/index");
                    } else {
                        res.render("announcements/index", {announcements:allAnnouncements,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                            search: req.query.search
                        });
                    }    
                 } 
            });     
        });
    } else {
        //get all announcements fron DB
        Announcement.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allAnnouncements) {
            Announcement.count().exec(function (err, count) {
            if (err){
                console.log(err);
            } else {
                res.render("announcements/index", {announcements:allAnnouncements,
                    announcements: allAnnouncements,
                    current: pageNumber,
                    pages: Math.ceil(count / perPage),
                    noMatch: noMatch,
                    search: false
                });
            } 
        });
      });    
    }    
}); 

//NEW ROUTE - new page to submit a new Announcements -new should be defined prior to /:id
router.get("/announcements/new", middleware.isLoggedIn, function(req, res){
    res.render("announcements/new");
});

//CREATE ROUTE - post new Announcement 
router.post("/announcements", middleware.isLoggedIn, async function (req, res) {
    var name = req.body.name;
    var desc      = req.body.desc;
    
    var author = {
    id: req.user._id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName
    }
    
    var newAnnouncement = {name: name, desc: desc, author: author};
    
    try {
      let announcement = await Announcement.create(newAnnouncement);
      let user = await User.findById(req.user._id).populate('followers').exec();
      let newNotification = {
        email: req.user.email,
        announcementId: announcement.id,
        announcementName: name
      }
      for(const follower of user.followers) {
        let notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        follower.save();
      }
      //redirect back to announcements page
      req.flash("success", "Your announcement has been successfully added.");
      res.redirect(`/announcements/${announcement.id}`);
    } catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

//SHOW ROUTE - Details about one item
router.get("/announcements/:id", [validator.param('id').isMongoId().trim()], function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
      req.flash("error", "Page not found");
      res.redirect("/announcements/index");
    }
    else {
        //finding Announcements  
         Announcement.findById(req.params.id, function (err, foundAnnouncement) {
            if (err || !foundAnnouncement) {
                req.flash("error", "Announcement not found");
                res.redirect("/announcements/index");
             } else {
                res.render("announcements/show", {announcement:foundAnnouncement});
             } 
        });
    }
});

//EDIT ROUTE
router.get("/announcements/:id/edit", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/announcements/index");
    }
    else {
        Announcement.findById(req.params.id, function (err, foundAnnouncement) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            } else {
                res.render("announcements/edit", {announcement:foundAnnouncement});
            }    
        });
    }    
});

//UPDATE ROUTE - update the details about one item
router.put("/announcements/:id", [validator.param('id').isMongoId().trim()], async function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/announcements/index");
    }
    else {
        Announcement.findByIdAndUpdate(req.params.id, req.body.announcement, {new: true}, function (err, updatedAnnouncement) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            else {
                req.flash("success", "Your announcement has been updated successfully.");
                res.redirect('/announcements/' + req.params.id);
            }
        });
    }    
});

//DELETE ROUTE - Delete the item
router.delete("/announcements/:id", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/announcements/index");
    }
    else {
        Announcement.findByIdAndRemove(req.params.id, function (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            } else {
                req.flash("success", "Your announcement has been deleted successfully.");
                res.redirect("/announcements/index");
            }
        });
    }    
});

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;