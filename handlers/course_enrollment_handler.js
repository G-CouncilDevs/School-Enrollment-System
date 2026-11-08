import CourseEnrollment from "../models/course_enrollment_model";

//POST
export async function createCourseEnrollment(req, res) {
    try{
        const newCourseEnrollment = new CourseEnrollment({
            student:    req.body.student,
            enrollment: req.body.enrollment,
            semester:   req.body.semester,
            course:     req.body.semester,
            block:      req.body.block,
            source:     req.body.source
        })
        const saved = await newCourseEnrollment.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}