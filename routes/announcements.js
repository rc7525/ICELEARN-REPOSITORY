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
                //render show template with that announcement
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
        //finding announcements for edit 
        if (req.isAuthenticated()) {
            Announcement.findById(req.params.id, function(err,foundAnnouncement) {
                 if (err || !foundAnnouncement) {
                    req.flash("error", "Announcement not found");
                    res.redirect("back");
                } else {
                    if (req.user.isSchoolAdmin) {
                        res.render("announcements/edit", {announcement:foundAnnouncement});
                    } else {
                        req.flash("error", "Your permission is not allowing to perform this function");
                        res.redirect("back");
                    }    
                } 
            });
        } else {
            req.flash("error", "You need to be logged in to perform this function");
            res.redirect("back");
        }    
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
        if (req.isAuthenticated()) {
            Announcement.findByIdAndUpdate(req.params.id, req.body.announcement, function(err,updatedAnnouncement) {
                 if (err || !updatedAnnouncement) {
                    req.flash("error", "Announcement not found");
                    res.redirect("/announcements/index");
                } else {
                    if (req.user.isSchoolAdmin) {
                        res.redirect("/announcements/" + req.params.id);
                    } else {
                        req.flash("error", "Your permission is not allowing to perform this function");
                        res.redirect("back");
                    }    
                } 
            });
        } else {
            req.flash("error", "You need to be logged in to perform this function");
            res.redirect("back");
        }    
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
      if (req.isAuthenticated()) {  
          Announcement.findById(req.params.id, function(err,announcement) {
              if (err || !announcement) {
                  req.flash("error", "Announcement not found");
                  res.redirect("/announcements/index");
              } else {
                  if (req.user.isSchoolAdmin) {
                       Announcement.findByIdAndRemove(req.params.id, function (err) {
                        if (err) {
                          req.flash("error", "Not able to delete Announcement.");    
                          res.redirect("/announcements/index");
                         } else {
                             req.flash("success", "Announcement Removed."); 
                             res.redirect("/announcements/index");
                        } 
                    });
                  } else {
                      req.flash("error", "Your permission is not allowing to perform this function");
                      res.redirect("back");
                  }
              }
         });
      } else {
          req.flash("error", "You need to be logged in to perform this function");
          res.redirect("back");
      }
    }
});

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;