import CourseRecord from "../models/course_record_model";

async function createCourseRecord(req, res) {
    try{
        const newCourseRecord = new CourseRecord({
            student:    req.body.student,
            course:     req.body.course,
            semester:   req.body.course,
            status:     req.body.status,
            grade:      req.body.grade
        })
        const saved = await newCourseRecord.save()
        res.status(201).json(saved)
    }
    catch(err){
        res.status(400).json({error:err.message})
    }
}