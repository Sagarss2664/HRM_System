// const mongoose = require('mongoose');

// const TimeSlotSchema = new mongoose.Schema({
//   startTime: String,
//   endTime: String
// });

// const DayAvailabilitySchema = new mongoose.Schema({
//   Monday: [TimeSlotSchema],
//   Tuesday: [TimeSlotSchema],
//   Wednesday: [TimeSlotSchema],
//   Thursday: [TimeSlotSchema],
//   Friday: [TimeSlotSchema],
//   Saturday: [TimeSlotSchema],
//   Sunday: [TimeSlotSchema]
// });

// const AvailabilitySchema = new mongoose.Schema({
//   developer: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Developer',
//     required: true
//   },
//   week: {
//     type: Number,
//     required: true
//   },
//   year: {
//     type: Number,
//     required: true
//   },
//   availability: DayAvailabilitySchema,
//   isSubmitted: {
//     type: Boolean,
//     default: false
//   },
//   submittedAt: {
//     type: Date
//   }
// });

// module.exports = mongoose.model('Availability', AvailabilitySchema);
const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
});

const AvailabilitySchema = new mongoose.Schema({
  developer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Developer',
    required: true 
  },
  week: { type: Number, required: true },
  year: { type: Number, required: true },
  availability: {
    Monday: [TimeSlotSchema],
    Tuesday: [TimeSlotSchema],
    Wednesday: [TimeSlotSchema],
    Thursday: [TimeSlotSchema],
    Friday: [TimeSlotSchema],
    Saturday: [TimeSlotSchema],
    Sunday: [TimeSlotSchema]
  },
  isSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date }
}, { timestamps: true });

// Add compound index for faster queries
AvailabilitySchema.index({ developer: 1, week: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Availability', AvailabilitySchema);