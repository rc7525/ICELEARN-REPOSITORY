var express = require("express");
var router = express.Router({mergeParams: true});
var School = require("../models/school");
var Program = require("../models/program");
var Semester = require("../models/semester");
var middleware = require("../middleware");
var validator   = require("express-validator/check");

// Semesters Index
router.get("/schools/:id/programs/:program_id/semesters", [validator.param('id').isMongoId().trim()], function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    School.findById(req.params.id).
            populate({
                path: "programs",
                options: {sort: {_id: -1}}
            }).exec(function(err,foundSchool) {
         if (err || !foundSchool) {
            req.flash("error", "School not found");
            res.redirect("schools/school._id/progrmas/index");
         } else {
            Program.findById(req.params.program_id).
            populate({
                path: "semesters",
                options: {sort: {_id: -1}}
            }).exec(function(err,foundProgram) {
             if (err || !foundProgram) {
                req.flash("error", "Program not found");
                res.redirect("/schools/programs/index");
             } else {
                //render show template with that programs
                res.render("program-semesters/index", {school:foundSchool, program:foundProgram});
             } 
            });
         }
    });
});

// Program Semesters New
router.get("/schools/:id/programs/:program_id/semesters/new", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    School.findById(req.params.id).
            populate({
                path: "programs",
                options: {sort: {_id: -1}}
            }).exec(function(err,foundSchool) {
         if (err || !foundSchool) {
            req.flash("error", "School not found");
            res.redirect("schools/school._id/progrmas/index");
         } else {
            Program.findById(req.params.program_id).
            populate({
                path: "semesters",
                options: {sort: {_id: -1}}
            }).exec(function(err,foundProgram) {
             if (err || !foundProgram) {
                req.flash("error", "Program not found");
                res.redirect("/schools/programs/index");
             } else {
                //render show template with that programs
                res.render("program-semesters/new", {school:foundSchool, program:foundProgram});
             } 
            });
         }
    });
});

// Program Semesters Create
router.post("/schools/:id/programs/:program_id/semesters", [validator.param('id').isMongoId().trim()], middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    else {
        //lookup program using ID
        School.findById(req.params.id).populate("programs").exec(function (err, foundSchool) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.findById(req.params.program_id).populate("semesters").exec(function (err, foundProgram) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Semester.create(req.body.semester, function (err, foundSemester) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                foundSemester.program = foundProgram;
                //save semester
                foundSemester.save();
                foundProgram.semesters.push(foundSemester);
                //save program
                foundProgram.save();
                req.flash("success", "Your semester has been successfully added.");
                res.render("program-semesters/index", {school:foundSchool, program:foundProgram});
            });
        });
      }); 
    }    
});

// Program Semesters Edit
router.get("/schools/:id/programs/:program_id/semesters/:semester_id/edit", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    else {
        School.findById(req.params.id).populate("programs").exec(function (err, foundSchool) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.findById(req.params.program_id).populate("semesters").exec(function (err, foundProgram) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Semester.findById(req.params.semester_id, function (err, foundSemester) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            res.render("program-semesters/edit", {school:foundSchool, program: foundProgram, semester: foundSemester});
        });
       }); 
      });
    }    
});

// Programs Semesters Update
router.put("/schools/:id/programs/:program_id/semesters/:semester_id", [validator.param('id').isMongoId().trim()],  function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    else {
        School.findById(req.params.id).populate("programs").exec(function (err, foundSchool) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Semester.findByIdAndUpdate(req.params.semester_id, req.body.semester, {new: true}, function (err, updatedSemester) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                Program.findById(req.params.program_id).populate("semesters").exec(function (err, foundProgram) {
                    if (err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                    foundProgram.save();
                    req.flash("success", "Your semester was successfully edited.");
                    res.render("program-semesters/index", {school:foundSchool, program:foundProgram, semester:updatedSemester});
            });
        });
      });    
    }    
});

// Program Semesters Delete
router.delete("/schools/:id/programs/:program_id/semesters/:semester_id", [validator.param('id').isMongoId().trim()],  middleware.isLoggedIn, function (req, res) {
    var errors = validator.validationResult(req);
    
    if (!errors.isEmpty() ) {
       req.flash("error", "Page not found");
       res.redirect("back");
    }
    else {
        School.findById(req.params.id).populate("programs").exec(function (err, foundSchool) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }    
        Semester.findByIdAndRemove(req.params.semester_id, function (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            Program.findByIdAndUpdate(req.params.program_id, {$pull: {semesters: req.params.semester_id}}, {new: true}).populate("semesters").exec(function (err, foundProgram) {
                if (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                //save changes
                foundProgram.save();
                req.flash("success", "Your Semester has been deleted successfully.");
                res.render("program-semesters/index", {school:foundSchool, program:foundProgram});
            });
        });
      });    
    }    
});

module.exports = router;