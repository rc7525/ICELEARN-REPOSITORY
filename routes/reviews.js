var express = require("express");
var router = express.Router({mergeParams: true});
var School = require("../models/school");
var Review = require("../models/review");
var middleware = require("../middleware");
var validator   = require("express-validator/check");

// Reviews Index
router.get("/schools/:id/reviews", [validator.param('id').isMongoId().trim()], function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {    
        School.findById(req.params.id).populate({
            path: "reviews",
            options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
        }).exec(function (err, school) {
            if (err || !school) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-reviews/index", {school: school});
        });
    }    
});

// School Reviews New
router.get("/schools/:id/reviews/new", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, middleware.checkReviewExistenceForSchool, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        // middleware.checkReviewExistence checks if a user already reviewed the school, only one review per user is allowed
        School.findById(req.params.id, function (err, school) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-reviews/new", {school: school});
        });
    }    
});

// School Reviews Create
router.post("/schools/:id/reviews", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, middleware.checkReviewExistenceForSchool, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        //lookup schools using ID
        School.findById(req.params.id).populate("reviews").exec(function (err, school) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Review.create(req.body.review, function (err, review) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //add author username/id and associated school to the review
                review.author.id = req.user._id;
                review.author.email = req.user.email;
                review.author.firstName = req.user.firstName;
                review.author.lastName = req.user.lastName;
                review.school = school;
                //save review
                review.save();
                school.reviews.push(review);
                // calculate the new average review for the school
                school.rating = calculateAverage(school.reviews);
                //save school
                school.save();
                req.flash("success", "Your review has been successfully added.");
                res.redirect('/schools/' + school._id);
            });
        });
    }    
});

// School Reviews Edit
router.get("/schools/:id/reviews/:review_id/edit", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, middleware.checkReviewOwnership, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Review.findById(req.params.review_id, function (err, foundReview) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-reviews/edit", {school_id: req.params.id, review: foundReview});
        });
    }    
});

// Schools Reviews Update
router.put("/schools/:id/reviews/:review_id", [validator.param('id').isMongoId().trim()],  middleware.checkReviewOwnership, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function (err, updatedReview) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            School.findById(req.params.id).populate("reviews").exec(function (err, school) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                // recalculate school average
                school.rating = calculateAverage(school.reviews);
                //save changes
                school.save();
                req.flash("success", "Your review was successfully edited.");
                res.redirect('/schools/' + school._id);
            });
        });
    }    
});

// School Reviews Delete
router.delete("/schools/:id/reviews/:review_id", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, middleware.checkReviewOwnership, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Review.findByIdAndRemove(req.params.review_id, function (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            School.findByIdAndUpdate(req.params.id, {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function (err, school) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                // recalculate school average
                school.rating = calculateAverage(school.reviews);
                //save changes
                school.save();
                req.flash("success", "Your school review was deleted successfully.");
                res.redirect("/schools/" + req.params.id);
            });
        });
    }    
});

function calculateAverage(reviews) {
    if (reviews.length === 0) {
        return 0;
    }
    var sum = 0;
    reviews.forEach(function (element) {
        sum += element.rating;
    });
    return sum / reviews.length;
}

module.exports = router;