const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobile: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Developer', 'Team Lead', 'Manager', 'HR'], // Add more roles as needed
    default: 'Developer'
  },
  password: {
    type: String
    // Optional: only add if authentication is handled in Employee schema
  },
  team: {
    type: String
    // Optional: if employee is assigned to a team
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
