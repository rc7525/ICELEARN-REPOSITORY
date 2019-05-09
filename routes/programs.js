var express = require("express");
var router = express.Router({mergeParams: true});
var School = require("../models/school");
var Program = require("../models/program");
var middleware = require("../middleware");
var validator   = require("express-validator/check");

// Programs Index
router.get("/schools/:id/programs", [validator.param('id').isMongoId().trim()], function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/school._id/");
    }
    else {    
        School.findById(req.params.id).populate({
            path: "programs",
            options: {sort: {createdAt: -1}} // sorting the populated programs array to show the latest first
        }).exec(function (err, school) {
            if (err || !school) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-programs/index", {school: school});
        });
    }    
});

// School Programs New
router.get("/schools/:id/programs/new", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        School.findById(req.params.id, function (err, school) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-programs/new", {school: school});
        });
    }    
});

// School Programs Create
router.post("/schools/:id/programs", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        //lookup schools using ID
        School.findById(req.params.id).populate("programs").exec(function (err, school) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.create(req.body.program, function (err, program) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //add author username/id and associated school to the review
                program.school = school;
                //save review
                program.save();
                school.programs.push(program);
               
                //save school
                school.save();
                req.flash("success", "Your program has been successfully added.");
                res.redirect('/schools/' + school._id);
            });
        });
    }    
});

// School Programs Edit
router.get("/schools/:id/programs/:program_id/edit", [validator.param('id').isMongoId().trim()], function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Program.findById(req.params.program_id, function (err, foundProgram) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("school-programs/edit", {school_id: req.params.id, program: foundProgram});
        });
    }    
});

// Schools Reviews Update
router.put("/schools/:id/programs/:program_id", [validator.param('id').isMongoId().trim()],  function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Program.findByIdAndUpdate(req.params.program_id, req.body.program, {new: true}, function (err, updatedProgram) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            School.findById(req.params.id).populate("programs").exec(function (err, school) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //save changes
                school.save();
                req.flash("success", "Your program was successfully edited.");
                res.redirect("/schools/"+ school._id +"/programs");
            });
        });
    }    
});

// School Programs Delete
router.delete("/schools/:id/programs/:program_id", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/schools/index");
    }
    else {
        Program.findByIdAndRemove(req.params.program_id, function (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            //remove program from school
            School.findByIdAndUpdate(req.params.id, {$pull: {programs: req.params.program_id}}, {new: true}).populate("programs").exec(function (err, school) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //save changes
                school.save();
                req.flash("success", "Your school program has been deleted successfully.");
                res.redirect("/schools/" + req.params.id);
            });
        });
    }    
});

module.exports = router;