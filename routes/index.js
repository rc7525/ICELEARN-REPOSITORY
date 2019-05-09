var express     = require("express");
var router      = express.Router();
var passport    = require("passport");
var validator   = require("express-validator/check");
var User        = require("../models/user");
var School      = require("../models/school");
var Announcement = require("../models/announcement");
var async       = require("async");
var nodemailer  = require("nodemailer");
var crypto      = require("crypto");
var middleware  = require("../middleware");
var methodOverride = require("method-override");
var Notification  = require("../models/notification");

require('dotenv').config();

//Method Override
router.use(methodOverride("_method"));

//root will be the home page with search form
router.get("/", function(req, res){
    res.render("home/index");
}); 

//root will be the home page with search form
router.get("/home/index", function(req, res){
    res.render("home/index");
}); 

//register route for the admin - present the register form
router.get("/admin-register", function(req, res){
   res.render("users/admin-register");
}); 

//to register the user
router.post("/admin-register", function(req, res){
   
    var username = req.body.username;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.username;
    var adminCode = req.body.adminCode;
  
    var newUser = {username: username, firstName: firstName, lastName: lastName, email:email, adminCode:adminCode};
   
   //creates a new user and pass in the password seperately and database keep the password as a huge string
    if (req.body.adminCode === 'spower'){
        newUser.isSchoolAdmin = true;
    }  
    
     if (req.body.adminCode === 'cpower'){
        newUser.isClassAdmin = true;
    }  
    //eval(require('locus'));
    User.register(newUser, req.body.password, function(err, user){
        
        if (err || !user) {
            console.log("I am in error!!!");
            console.log(err);
            console.log(user);
            req.flash("error", err.message);
            return res.redirect("/admin-register");
        } 
        //logs the user in using the local strategy
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to CMS College, Kottayam!");
            res.redirect("/home/index");
        });
   });
});     

//register route - present the register form
router.get("/register", function(req, res){
   res.render("users/register");
}); 

//to register the user
router.post("/register", function(req, res){
   
    var username = req.body.username;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.username;
    var adminCode = req.body.adminCode;
  
    var newUser = {username: username, firstName: firstName, lastName: lastName, email:email, adminCode:adminCode};
   
    //eval(require('locus'));
    User.register(newUser, req.body.password, function(err, user){
        
        if (err || !user) {
            console.log("I am in error!!!");
            console.log(err);
            console.log(user);
            req.flash("error", err.message);
            return res.redirect("/register");
        } 
        //logs the user in using the local strategy
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to CMS College, Kottayam!");
            res.redirect("/");
        });
   });
});     

//LOGIN ROUTES - render login form
router.get("/login", function(req, res){
   res.render("users/login");
});

//LOGIN - POST - Middleware - sits between begin and end
//passport will have the username and password
router.post("/login", passport.authenticate("local", {
    successRedirect: "/home/index",
    failureFlash: 'Incorrect Email address/Password. Please enter the correct Email address/Password.',
    failureRedirect: "/login",
    successFlash: 'Welcome to CMS College, Kottayam!'
}), function(req, res){
});

//LOGOUT
router.get("/logout", function(req, res){
    //destroying all user data from the session 
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/home/index");
});

//FORGOT PASSWORD
router.get("/forgot", function(req, res){
   res.render("users/forgot");
});

router.post("/forgot", function(req, res, next){
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);//link for the user to click
            });
        },
        function(token, done) {
            User.findOne({email:req.body.email}, function(err, user) {
                if (!user) {
                    req.flash('error', "No account with that email address exists");
                    return res.redirect("users/forgot");
                    
                }
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; //1 hour
                
                user.save(function(err){
                    done(err, token, user);
                });
            });
        },    
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_ID,
                    pass: process.env.EMAIL_PASSWORD
             }
            });
            var mailOptions = {
                    to: user.email,
                    from: process.env.EMAIL_ID,
                    subject: 'CMS College, Kottayam Password Reset',
                    text: 'Hello, \n\n' +
                        'You are receiving this email because you have requested the reset of the password for CMS College, Kottayam. ' +
                        'Please click on the following link, or paste this into your browser to complete the process. ' +
                        'https://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.' + '\n\n\n' +
                    'The Site Admin.'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash('success', 'An email has been sent to ' + user.email + ' with further instructions to reset your password.')
                res.redirect("/");
            });
          }    
        ], function (err) {
            if (err) return next(err);
            res.redirect("users/forgot");
    });
});

//PASSWORD RESET PAGE RENDERING
router.get("/reset/:token", function(req, res){
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invlaid or has expires.');
            return res.redirect('/forgot');
        }
        res.render('users/reset', {token: req.params.token});
    });
});

//PASSWORD RESET PROCESS
router.post("/reset/:token", function(req, res, next){
    async.waterfall([
        function(done) {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('/back');
                }
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function(err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;
                        
                        user.save(function(err) {
                            req.login(user, function(err) {
                                done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect('back');
                }
            });
          }, 
          function(user, done) {
              var smtpTransport = nodemailer.createTransport({
                  service: 'Gmail',
                  auth: {
                        user: process.env.EMAIL_ID,
                        //pass: process.env.GMAILPW
                        pass: process.env.EMAIL_PASSWORD
                  }
              });
              var mailOptions = {
                to: user.email,
                from: process.env.EMAIL_ID,
                subject: 'Your password has been changed',
                text: 'Hello, \n\n' +
                    'This is a confirmation that your password for the CMS College, Kottayam account ' + user.email + ' has just been reset.' + '\n\n\n' +
                    'The Site Admin.'
              };
              smtpTransport.sendMail(mailOptions, function(err){
                req.flash('success', 'Success! Your password has been changed.');
                res.redirect('/');
            });
          }    
        ], function (err) {
            res.redirect('/');
     });
});

//USER PFOFILE EDIT PAGE RENDERING
router.get("/edit-profile", function(req, res){
   res.render("users/edit-profile");
});

//UPDATE USER PROFILE
router.post("/users/:id", function(req, res) {
        
    if (req.isAuthenticated()) {
        User.findByIdAndUpdate(req.params.id, req.body.currentUser, function(err,updatedUser) {
             if (err || !updatedUser) {
                console.log("I am Inside the error!!!"); 
                req.flash("error", "User not found");
                res.redirect("/");
            } else {
                req.flash("success", "User profile updated.");  
                res.redirect("/");
            } 
        });
    } else {
            req.flash("error", "You need to be logged in to perform this function");
            res.redirect("back");
    } 
});  

// Follow a specific user's announcement
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.params.id);
    //Checking to see whether the user is already following 
    var found = false;
    for(var i = 0; i < user.followers.length; i++) {
        if (user.followers[i]._id.equals(req.user._id)) {
            found = true;
            break;
        }
    }
    
    if (!found) {
        user.followers.push(req.user._id);
        user.save();
        req.flash('success', 'Successfully following news and announcements!');
        res.redirect('/');
    }
    else {
        req.flash('error', 'You are already a follower of news and announcements.');
        res.redirect('/');
    }
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

//  view all postings from user notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.user._id).populate({
      path: 'notifications',
      options: { sort: { "_id": -1 } }
    }).exec();
    let allNotifications = user.notifications;
    res.render("notifications/index", { allNotifications });
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    if (notification.announcementId) {
        res.redirect(`/announcements/${notification.announcementId}`);
    } 
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

module.exports = router;