import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  week: {
    type: Number,
    required: true,
  },
  day:{
    type: Number,
    required: true
  },
  assignments: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  participation: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  performance: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const attendanceSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 31
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 53
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  status: {
    type: Boolean,
    required: true,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    default: null,
  },
  studentCode: {
    type: String,
    required: true,
    unique: true,
  },
   attendance: [attendanceSchema],
  ratings: [ratingSchema],
  badges: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate student code before saving
studentSchema.pre("save", function (next) {
  if (!this.studentCode) {
    this.studentCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

const Student = mongoose.model("Student", studentSchema);

export default Student; 
