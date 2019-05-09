var express = require("express");
var router = express.Router({mergeParams: true});
var Program = require("../models/program");
var Semester = require("../models/semester");
var middleware = require("../middleware");
var validator   = require("express-validator/check");

// Semesters Index
router.get("/programs/:id/semesters", [validator.param('id').isMongoId().trim()], function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/Progrmas/index");
    }
    else {    
        Program.findById(req.params.id).populate({
            path: "semesters",
            options: {sort: {createdAt: -1}} // sorting the populated semesters array to show the latest first
        }).exec(function (err, program) {
            if (err || !program) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("program-semesters/index", {program: program});
        });
    }    
});

// Program Semesters New
router.get("/programs/:id/semesters/new", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/programs/index");
    }
    else {
        Program.findById(req.params.id, function (err, program) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("program-semesters/new", {program: program});
        });
    }    
});

// Program Semesters Create
router.post("/programs/:id/semesters", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/programs/index");
    }
    else {
        //lookup program using ID
        Program.findById(req.params.id).populate("semesters").exec(function (err, program) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Semester.create(req.body.semester, function (err, semester) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                semester.program = program;
                //save semester
                semester.save();
                program.semesters.push(semester);
                //save program
                program.save();
                req.flash("success", "Your program has been successfully added.");
                res.redirect('/programs/' + program._id);
            });
        });
    }    
});

// Program Semesters Edit
router.get("/programs/:id/semesters/:semester_id/edit", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/programs/index");
    }
    else {
        Semester.findById(req.params.semester_id, function (err, foundSemester) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("program-semesters/edit", {program_id: req.params.id, semester: foundSemester});
        });
    }    
});

// Programs Semesters Update
router.put("/programs/:id/semesters/:semester_id", [validator.param('id').isMongoId().trim()],  function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/programs/index");
    }
    else {
        Semester.findByIdAndUpdate(req.params.semester_id, req.body.semester, {new: true}, function (err, updatedSemester) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.findById(req.params.id).populate("semesters").exec(function (err, program) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                program.save();
                req.flash("success", "Your semester was successfully edited.");
                res.redirect('/programs/' + program._id);
            });
        });
    }    
});

// Program Semesters Delete
router.delete("/programs/:id/semesters/:semester_id", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("/programs/index");
    }
    else {
        Semester.findByIdAndRemove(req.params.semester_id, function (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.findByIdAndUpdate(req.params.id, {$pull: {semesters: req.params.semester_id}}, {new: true}).populate("semesters").exec(function (err, program) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //save changes
                program.save();
                req.flash("success", "Your program semester has been deleted successfully.");
                res.redirect("/programs/" + req.params.id);
            });
        });
    }    
});

module.exports = router;