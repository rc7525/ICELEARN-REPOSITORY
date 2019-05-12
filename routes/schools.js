var express     = require("express");
var router      = express.Router();
var School        = require("../models/school");
var User        = require("../models/user");
var Notification = require("../models/notification");
var Review      = require("../models/review");
var Program      = require("../models/program");
var Sequence    = require("../models/sequence");
var validator   = require("express-validator/check");
var methodOverride = require("method-override");
var middleware  = require("../middleware");
var multer      = require('multer');
var async       = require("async");

require('dotenv').config();

//Method Override
router.use(methodOverride("_method"));

//MULTER
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter});

//CLOUDINARY
var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

//INDEX ROUTE - get schools 
router.get("/schools/index", function(req, res){
    //fuzzy search - req-query will have the search criteria
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    
    if(req.query.search){
        const regExp = new RegExp(escapeRegExp(req.query.search), 'gi');
        School.find({name: regExp}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allSchools) {
            School.count({name: regExp}).exec(function (err, count) {
                if (err){
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(allSchools.length < 1) {
                        req.flash("error", "No Schools match your search criteria. Please try again.");
                        res.redirect("/schools/index");
                    } else {
                        res.render("schools/index", {schools:allSchools,
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
        //get all schools fron DB
        School.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allSchools) {
            School.count().exec(function (err, count) {
            if (err){
                console.log(err);
            } else {
                res.render("schools/index", {schools:allSchools,
                    schools: allSchools,
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

//NEW ROUTE - new page to submit a new schools -new should be defined prior to /:id
router.get("/schools/new", middleware.isLoggedIn, function(req, res){
    res.render("schools/new");
});

//CREATE ROUTE - post new schoo - 
router.post("/schools", upload.single('image'), middleware.isLoggedIn, async function (req, res) {
    var image = "";
    var sequence = "";
    
    if (!isEmptyObject('image')) {
        await cloudinary.uploader.upload(req.file.path, async function(result) {
            image = result.secure_url;
        });    
    } 
    
    Sequence.find(function(err, data){
        if(err){ 
            req.flash("error", err.message);
            res.redirect("back");
        }
    
        if(data.length < 1){
          // create if doesn't exist create and return first
          Sequence.create({}, function(err, seq){
            if(err) { 
                req.flash("error", err.message);
                res.redirect("back");
            }
            sequence = seq.nextSeqNumber;
          });
        } else {
          // update sequence and return next
          Sequence.findByIdAndUpdate(data[0]._id, { $inc: { nextSeqNumber: 1 } }, async function(err, seq){
            if(err) { 
                req.flash("error", err.message);
                res.redirect("back");
            }
            
            var username  = req.body.name.substring(0, 3) + "ICE" + seq.nextSeqNumber;
               
            var email     = username + "@ice.edu";
            var name = req.body.name;
            var address_1 = req.body.address_1;
            var address_2 = req.body.address_2;
            var city      = req.body.city;
            var state     = req.body.state;
            var zip       = req.body.zip; 
            var phone_number = req.body.phone_number;
            var desc      = req.body.desc;
            
            var newSchool = {username: username, email: email, name: name, address_1: address_1, address_2: address_2, city: city, state: state, zip: zip, phone_number: phone_number, image: image, desc: desc};
            
            try {
              let school = await School.create(newSchool);
              let user = await User.findById(req.user._id).populate('followers').exec();
              let newNotification = {
                email: req.user.email,
                schoolId: school.id,
                schoolName: name
              }
              for(const follower of user.followers) {
                let notification = await Notification.create(newNotification);
                follower.notifications.push(notification);
                follower.save();
              }
              //redirect back to schools page
              res.redirect(`/schools/${school.id}`);
            } catch(err) {
                req.flash('error', err.message);
                res.redirect('back');
            }
          });
        }
    });
});

//SHOW ROUTE - Details about one item
router.get("/schools/:id", [validator.param('id').isMongoId().trim()], function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
      req.flash("error", "Page not found");
      res.redirect("/schools/index");
    }
    else {
        //finding schools and populating the reviews associated  
         School.findById(req.params.id).
            populate({
                path: "reviews",
                options: {sort: {_id: -1}}
            }).populate({
                path: "programs",
                options: {sort: {_id: -1}}
            }).exec(function(err,foundSchool) {
             if (err || !foundSchool) {
                req.flash("error", "School not found");
                res.redirect("/schools/index");
             } else {
                 Program.findById(req.params.id, function (err, foundProgram) {
                    if (err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    } else {
                        //render show template with that school
                        res.render("schools/show", {school:foundSchool, program:foundProgram});
                    }    
                });        
             } 
        });
    }
});

//EDIT ROUTE
router.get("/schools/:id/edit", [validator.param('id').isMongoId().trim()], function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
        req.flash("error", "Page not found");
        res.redirect("/schools/index");
    }
    else {
        //finding schools and populating the reviews associated 
        if (req.isAuthenticated()) {
            School.findById(req.params.id, function(err,foundSchool) {
                 if (err || !foundSchool) {
                    req.flash("error", "School not found");
                    res.redirect("back");
                } else {
                    if (req.user.isSchoolAdmin) {
                        res.render("schools/edit", {school:foundSchool});
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
router.put("/schools/:id", upload.single('school[image]'), [validator.param('id').isMongoId().trim()], async function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
        req.flash("error", "Page not found");
        res.redirect("/schools/index");
    }
    else {
        if (req.isAuthenticated()) {
            if (!isEmptyObject('school[image]')) {
                await cloudinary.uploader.upload(req.file.path, async function(result) {
                    req.body.school.image = result.secure_url;
                });
            }
            
            School.findByIdAndUpdate(req.params.id, req.body.school, function(err,updatedSchool) {
                 if (err || !updatedSchool) {
                    req.flash("error", "School not found");
                    res.redirect("/schools/index");
                } else {
                    if (req.user.isSchoolAdmin) {
                        res.redirect("/schools/" + req.params.id);
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
router.delete("/schools/:id", [validator.param('id').isMongoId().trim()], function(req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
        req.flash("error", "Page not found");
        res.redirect("/schools/index");
    }
    else {
      if (req.isAuthenticated()) {  
          School.findById(req.params.id, function(err,school) {
              if (err || !school) {
                  req.flash("error", "School not found");
                  res.redirect("/schools/index");
              } else {
                  if (req.user.isSchoolAdmin) {
                    Review.remove({
                        "_id": { $in: school.reviews } 
                        }, function (err) {
                        if (err) {
                          req.flash("error", "Not able to delete school reviews");    
                          res.redirect("/schools/index");
                         } 
                    });
                    Program.remove({
                        "_id": { $in: school.programs } 
                        }, function (err) {
                        if (err) {
                          req.flash("error", "Not able to delete school programs");    
                          res.redirect("/schools/index");
                         } else {
                             school.remove();
                             res.redirect("/schools/index");
                        } 
                    });
                  } else {
                      req.flash("error", "Your permission is not allowing to perform this function");
                      res.redirect("back");
                  }// checking author.id = req.user._id
              }
         });
      } else {
          req.flash("error", "You need to be logged in to perform this function");
          res.redirect("back");
      }
    }
});

//DELETE ROUTE - Delete the item
// router.delete("/schools/:id", [validator.param('id').isMongoId().trim()], function(req, res) {
//     var errors = validator.validationResult(req);
    
//     if (!errors.isEmpty() ) {
//         req.flash("error", "Page not found");
//         res.redirect("/schools/index");
//     }
//     else {
//       if (req.isAuthenticated()) {  
//           School.findById(req.params.id, function(err,school) {
//               if (err || !school) {
//                   req.flash("error", "School not found");
//                   res.redirect("/schools/index");
//               } else {
//                   if (req.user.isSchoolAdmin) {
//                     Review.remove({
//                         "_id": { $in: school.reviews } 
//                         }, function (err) {
//                         if (err) {
//                           req.flash("error", "Not able to delete school reviews");    
//                           res.redirect("/schools/index");
//                          } else {
//                              school.remove();
//                              res.redirect("/schools/index");
//                         } 
//                     });
//                   } else {
//                       req.flash("error", "Your permission is not allowing to perform this function");
//                       res.redirect("back");
//                   }// checking author.id = req.user._id
//               }
//          });
//       } else {
//           req.flash("error", "You need to be logged in to perform this function");
//           res.redirect("back");
//       }
//     }
// });

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//Check to see whether an object is empty
function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

module.exports = router;