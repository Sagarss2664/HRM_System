const WorkLogSchema = new mongoose.Schema({
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Developer',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Add indexes for better query performance
WorkLogSchema.index({ developer: 1, date: 1 });
WorkLogSchema.index({ date: 1 });

const WorkLog = mongoose.model('WorkLog', WorkLogSchema);