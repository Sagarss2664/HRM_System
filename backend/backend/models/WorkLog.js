const mongoose = require('mongoose');

const WorkLogSchema = new mongoose.Schema({
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Developer',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  loginTime: {
    type: Date
  },
  logoutTime: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('WorkLog', WorkLogSchema);