const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb+srv://01fe22bcs259:Sagar@cluster0.v0jo1.mongodb.net/hrm_system')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const LoginSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const EmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  role: { type: String, required: true, enum: ['HR', 'Team Lead', 'Developer'] },
  teamId: { type: String },
  teamName: { type: String }
});

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  leadId: { type: String, required: true, unique: true },
  leadName: { type: String, required: true },
  memberIds: { type: [String], default: [] }
});

// Models
const Login = mongoose.model('Login', LoginSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const Team = mongoose.model('Team', TeamSchema);

// Login Endpoint
app.post('/api/login/hr', async (req, res) => {
  const { employeeId, password } = req.body;
  try {
    const user = await Login.findOne({ employeeId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) return res.status(404).json({ message: 'Employee details not found' });

    if (employee.role !== 'HR') {
      return res.status(403).json({ message: 'Access denied: Only HR can login here' });
    }

    res.json({ 
      message: 'HR login successful',
      employee: {
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        role: employee.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// HR Dashboard APIs
app.post('/api/check-employee-id', async (req, res) => {
  const { employeeId } = req.body;
  try {
    const employee = await Employee.findOne({ employeeId });
    res.json({ exists: !!employee });
  } catch (error) {
    console.error('Error checking employee ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/add-employee', async (req, res) => {
  try {
    const { employeeId, name, email, mobile, role, password, teamName, teamId } = req.body;
    
    // Create login credentials
    const newLogin = new Login({ employeeId, password });
    await newLogin.save();
    
    // Create employee record
    const newEmployee = new Employee({ employeeId, name, email, mobile, role });
    await newEmployee.save();
    
    // Handle team assignment based on role
    if (role === 'Team Lead' && teamName) {
      const newTeam = new Team({
        name: teamName,
        leadId: employeeId,
        leadName: name,
        memberIds: req.body.memberIds || []
      });
      await newTeam.save();
      
      // Update assigned members
      if (req.body.memberIds && req.body.memberIds.length > 0) {
        await Employee.updateMany(
          { employeeId: { $in: req.body.memberIds } },
          { $set: { teamId: newTeam._id, teamName } }
        );
      }
    } else if (role === 'Developer' && teamId) {
      const team = await Team.findById(teamId);
      if (team) {
        await Employee.updateOne(
          { employeeId },
          { $set: { teamId, teamName: team.name } }
        );
        await Team.updateOne(
          { _id: teamId },
          { $push: { memberIds: employeeId } }
        );
      }
    }
    
    res.json({ success: true, message: 'Employee added successfully' });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ message: error.message || 'Failed to add employee' });
  }
});

app.get('/api/statistics', async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const totalTeamLeads = await Employee.countDocuments({ role: 'Team Lead' });
    const totalDevelopers = await Employee.countDocuments({ role: 'Developer' });
    const totalTeams = await Team.countDocuments();
    
    res.json({ totalEmployees, totalTeamLeads, totalDevelopers, totalTeams });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({}, '-_id employeeId name email mobile role teamName');
    res.json(employees);
  } catch (error) {
    console.error('Error getting employees:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/available-members', async (req, res) => {
  try {
    // Get developers not assigned to any team
    const members = await Employee.find(
      { role: 'Developer', teamId: { $exists: false } },
      'employeeId name role'
    );
    res.json(members);
  } catch (error) {
    console.error('Error getting available members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find({}, 'name leadName');
    res.json(teams);
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { name, email, mobile, role, password, teamName, teamId } = req.body;

    // Update employee record
    const updateData = { name, email, mobile, role };
    if (teamName) updateData.teamName = teamName;
    if (teamId) updateData.teamId = teamId;

    await Employee.updateOne({ employeeId }, { $set: updateData });

    // Update password if provided
    if (password) {
      await Login.updateOne({ employeeId }, { $set: { password } });
    }

    // Handle team updates if role changed
    if (role === 'Team Lead' && teamName) {
      // Check if team already exists for this lead
      const existingTeam = await Team.findOne({ leadId: employeeId });
      if (existingTeam) {
        await Team.updateOne(
          { leadId: employeeId },
          { $set: { name: teamName } }
        );
      } else {
        const newTeam = new Team({
          name: teamName,
          leadId: employeeId,
          leadName: name
        });
        await newTeam.save();
      }
    }

    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: error.message || 'Failed to update employee' });
  }
});

app.delete('/api/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Delete employee and login records
    await Promise.all([
      Employee.deleteOne({ employeeId }),
      Login.deleteOne({ employeeId })
    ]);

    // Check if this employee was a team lead and delete their team
    await Team.deleteOne({ leadId: employeeId });

    // Remove this employee from any teams they were a member of
    await Team.updateMany(
      { memberIds: employeeId },
      { $pull: { memberIds: employeeId } }
    );

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: error.message || 'Failed to delete employee' });
  }
});

// Get employee by ID
app.get('/api/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      teamId: employee.teamId,
      teamName: employee.teamName
    });
  } catch (error) {
    console.error('Error getting employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login/teamlead', async (req, res) => {
    const { employeeId, password } = req.body;
    try {
        const user = await Login.findOne({ employeeId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ message: 'Employee details not found' });

        if (employee.role !== 'Team Lead') {
            return res.status(403).json({ message: 'Access denied: Only Team Leads can login here' });
        }

        res.json({ message: 'Team Lead login successful', employee });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Developer Login
app.post('/api/login/developer', async (req, res) => {
    const { employeeId, password } = req.body;
    try {
        const user = await Login.findOne({ employeeId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const employee = await Employee.findOne({ employeeId });
        if (!employee) return res.status(404).json({ message: 'Employee details not found' });

        if (employee.role !== 'Developer') {
            return res.status(403).json({ message: 'Access denied: Only Developers can login here' });
        }

        res.json({ message: 'Developer login successful', employee });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////
// Add these schemas to your existing schemas
const NotificationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const TimeTrackingSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  clockedIn: { type: Boolean, default: false },
  lastClockIn: { type: Date },
  todayDuration: { type: String, default: '0h 0m' },
  weeklyTotal: { type: String, default: '0h 0m' },
  sessions: [{
    clockIn: { type: Date },
    clockOut: { type: Date },
    duration: { type: Number } // in minutes
  }]
});

const AvailabilitySchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  days: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    selected: { type: Boolean, default: false },
    hours: { type: Number, default: 0 }
  }],
  submitted: { type: Boolean, default: false }
});

// Add these models
const Notification = mongoose.model('Notification', NotificationSchema);
const TimeTracking = mongoose.model('TimeTracking', TimeTrackingSchema);
const Availability = mongoose.model('Availability', AvailabilitySchema);

// Developer Dashboard APIs

// Get employee data
app.get('/api/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      teamId: employee.teamId,
      teamName: employee.teamName
    });
  } catch (error) {
    console.error('Error getting employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notifications
app.get('/api/notifications/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const notifications = await Notification.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/mark-read', async (req, res) => {
  try {
    const { employeeId, notificationId } = req.body;
    
    await Notification.updateOne(
      { _id: notificationId, employeeId },
      { $set: { read: true } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get time tracking data
app.get('/api/time-tracking/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    let timeTracking = await TimeTracking.findOne({ employeeId });
    
    if (!timeTracking) {
      // Create a new record if it doesn't exist
      timeTracking = new TimeTracking({ employeeId });
      await timeTracking.save();
    }
    
    res.json({
      clockedIn: timeTracking.clockedIn,
      lastClockIn: timeTracking.lastClockIn,
      todayDuration: timeTracking.todayDuration,
      weeklyTotal: timeTracking.weeklyTotal
    });
  } catch (error) {
    console.error('Error getting time tracking data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clock in
app.post('/api/time-tracking/clock-in', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const now = new Date();
    
    let timeTracking = await TimeTracking.findOne({ employeeId });
    
    if (!timeTracking) {
      timeTracking = new TimeTracking({ employeeId });
    }
    
    if (timeTracking.clockedIn) {
      return res.status(400).json({ message: 'Already clocked in' });
    }
    
    timeTracking.clockedIn = true;
    timeTracking.lastClockIn = now;
    timeTracking.sessions.push({
      clockIn: now
    });
    
    await timeTracking.save();
    
    res.json({
      clockedIn: true,
      lastClockIn: now,
      todayDuration: timeTracking.todayDuration,
      weeklyTotal: timeTracking.weeklyTotal
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clock out
app.post('/api/time-tracking/clock-out', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const now = new Date();
    
    const timeTracking = await TimeTracking.findOne({ employeeId });
    
    if (!timeTracking || !timeTracking.clockedIn) {
      return res.status(400).json({ message: 'Not clocked in' });
    }
    
    // Find the current session (last one without clockOut)
    const currentSession = timeTracking.sessions.find(s => !s.clockOut);
    
    if (currentSession) {
      currentSession.clockOut = now;
      const durationMs = now - currentSession.clockIn;
      currentSession.duration = Math.floor(durationMs / (1000 * 60)); // in minutes
      
      // Update today's duration
      const todayMinutes = currentSession.duration;
      const hours = Math.floor(todayMinutes / 60);
      const minutes = todayMinutes % 60;
      timeTracking.todayDuration = `${hours}h ${minutes}m`;
      
      // Update weekly total (simplified - in a real app you'd aggregate all sessions for the week)
      const weeklyMinutes = timeTracking.sessions
        .filter(s => s.clockOut)
        .reduce((sum, s) => sum + s.duration, 0);
      const weeklyHours = Math.floor(weeklyMinutes / 60);
      const weeklyMins = weeklyMinutes % 60;
      timeTracking.weeklyTotal = `${weeklyHours}h ${weeklyMins}m`;
    }
    
    timeTracking.clockedIn = false;
    await timeTracking.save();
    
    res.json({
      clockedIn: false,
      lastClockIn: timeTracking.lastClockIn,
      todayDuration: timeTracking.todayDuration,
      weeklyTotal: timeTracking.weeklyTotal
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get availability
app.get('/api/availability/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    let availability = await Availability.findOne({ employeeId });
    
    if (!availability) {
      // Create default availability if it doesn't exist
      availability = new Availability({
        employeeId,
        days: [
          { id: 1, name: 'Monday', selected: false, hours: 9 },
          { id: 2, name: 'Tuesday', selected: false, hours: 9 },
          { id: 3, name: 'Wednesday', selected: false, hours: 9 },
          { id: 4, name: 'Thursday', selected: false, hours: 9 },
          { id: 5, name: 'Friday', selected: false, hours: 0 }
        ],
        submitted: false
      });
      await availability.save();
    }
    
    res.json(availability);
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit availability
app.post('/api/availability', async (req, res) => {
  try {
    const { employeeId, days } = req.body;
    
    // Calculate total hours
    const totalHours = days
      .filter(day => day.selected)
      .reduce((sum, day) => sum + day.hours, 0);
    
    if (totalHours !== 36) {
      return res.status(400).json({ 
        message: `Total hours must be 36 (currently ${totalHours})` 
      });
    }
    
    let availability = await Availability.findOne({ employeeId });
    
    if (!availability) {
      availability = new Availability({ employeeId });
    }
    
    availability.days = days;
    availability.submitted = true;
    
    await availability.save();
    
    res.json(availability);
  } catch (error) {
    console.error('Error submitting availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // MongoDB connection
// mongoose.connect('mongodb+srv://01fe22bcs259:Sagar@cluster0.v0jo1.mongodb.net/hrm_system')
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Schemas
// const LoginSchema = new mongoose.Schema({
//   employeeId: { type: String, required: true, unique: true },
//   password: { type: String, required: true }
// });

// const EmployeeSchema = new mongoose.Schema({
//   employeeId: { type: String, required: true, unique: true },
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   mobile: { type: String, required: true },
//   role: { type: String, required: true, enum: ['HR', 'Team Lead', 'Developer'] },
//   teamId: { type: String },
//   teamName: { type: String }
// });

// const TeamSchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true },
//   leadId: { type: String, required: true, unique: true },
//   leadName: { type: String, required: true },
//   memberIds: { type: [String], default: [] }
// });

// const NotificationSchema = new mongoose.Schema({
//   employeeId: { type: String, required: true },
//   title: { type: String, required: true },
//   message: { type: String, required: true },
//   read: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now }
// });

// const TimeTrackingSchema = new mongoose.Schema({
//   employeeId: { type: String, required: true, unique: true },
//   clockedIn: { type: Boolean, default: false },
//   lastClockIn: { type: Date },
//   todayDuration: { type: String, default: '0h 0m' },
//   weeklyTotal: { type: String, default: '0h 0m' },
//   sessions: [{
//     clockIn: { type: Date },
//     clockOut: { type: Date },
//     duration: { type: Number } // in minutes
//   }]
// });

// const AvailabilitySchema = new mongoose.Schema({
//   employeeId: { type: String, required: true, unique: true },
//   days: [{
//     id: { type: Number, required: true },
//     name: { type: String, required: true },
//     selected: { type: Boolean, default: false },
//     hours: { type: Number, default: 0 }
//   }],
//   submitted: { type: Boolean, default: false }
// });

// // Models
// const Login = mongoose.model('Login', LoginSchema);
// const Employee = mongoose.model('Employee', EmployeeSchema);
// const Team = mongoose.model('Team', TeamSchema);
// const Notification = mongoose.model('Notification', NotificationSchema);
// const TimeTracking = mongoose.model('TimeTracking', TimeTrackingSchema);
// const Availability = mongoose.model('Availability', AvailabilitySchema);

// // Login Endpoints
// app.post('/api/login/hr', async (req, res) => {
//   const { employeeId, password } = req.body;
//   try {
//     const user = await Login.findOne({ employeeId });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (password !== user.password) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const employee = await Employee.findOne({ employeeId });
//     if (!employee) return res.status(404).json({ message: 'Employee details not found' });

//     if (employee.role !== 'HR') {
//       return res.status(403).json({ message: 'Access denied: Only HR can login here' });
//     }

//     res.json({ 
//       message: 'HR login successful',
//       employee: {
//         name: employee.name,
//         email: employee.email,
//         mobile: employee.mobile,
//         role: employee.role
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error });
//   }
// });

// app.post('/api/login/teamlead', async (req, res) => {
//   const { employeeId, password } = req.body;
//   try {
//     const user = await Login.findOne({ employeeId });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (password !== user.password) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const employee = await Employee.findOne({ employeeId });
//     if (!employee) return res.status(404).json({ message: 'Employee details not found' });

//     if (employee.role !== 'Team Lead') {
//       return res.status(403).json({ message: 'Access denied: Only Team Leads can login here' });
//     }

//     res.json({ 
//       message: 'Team Lead login successful',
//       employee: {
//         name: employee.name,
//         email: employee.email,
//         mobile: employee.mobile,
//         role: employee.role,
//         teamId: employee.teamId,
//         teamName: employee.teamName
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error });
//   }
// });

// app.post('/api/login/developer', async (req, res) => {
//   const { employeeId, password } = req.body;
//   try {
//     const user = await Login.findOne({ employeeId });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     if (password !== user.password) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const employee = await Employee.findOne({ employeeId });
//     if (!employee) return res.status(404).json({ message: 'Employee details not found' });

//     if (employee.role !== 'Developer') {
//       return res.status(403).json({ message: 'Access denied: Only Developers can login here' });
//     }

//     res.json({ 
//       message: 'Developer login successful',
//       employee: {
//         name: employee.name,
//         email: employee.email,
//         mobile: employee.mobile,
//         role: employee.role,
//         teamId: employee.teamId,
//         teamName: employee.teamName
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error });
//   }
// });

// // HR Dashboard APIs
// app.post('/api/check-employee-id', async (req, res) => {
//   const { employeeId } = req.body;
//   try {
//     const employee = await Employee.findOne({ employeeId });
//     res.json({ exists: !!employee });
//   } catch (error) {
//     console.error('Error checking employee ID:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.post('/api/add-employee', async (req, res) => {
//   try {
//     const { employeeId, name, email, mobile, role, password, teamName, teamId } = req.body;
    
//     // Create login credentials
//     const newLogin = new Login({ employeeId, password });
//     await newLogin.save();
    
//     // Create employee record
//     const newEmployee = new Employee({ employeeId, name, email, mobile, role });
//     await newEmployee.save();
    
//     // Handle team assignment based on role
//     if (role === 'Team Lead' && teamName) {
//       const newTeam = new Team({
//         name: teamName,
//         leadId: employeeId,
//         leadName: name,
//         memberIds: req.body.memberIds || []
//       });
//       await newTeam.save();
      
//       // Update assigned members
//       if (req.body.memberIds && req.body.memberIds.length > 0) {
//         await Employee.updateMany(
//           { employeeId: { $in: req.body.memberIds } },
//           { $set: { teamId: newTeam._id, teamName } }
//         );
//       }
//     } else if (role === 'Developer' && teamId) {
//       const team = await Team.findById(teamId);
//       if (team) {
//         await Employee.updateOne(
//           { employeeId },
//           { $set: { teamId, teamName: team.name } }
//         );
//         await Team.updateOne(
//           { _id: teamId },
//           { $push: { memberIds: employeeId } }
//         );
//       }
//     }
    
//     res.json({ success: true, message: 'Employee added successfully' });
//   } catch (error) {
//     console.error('Error adding employee:', error);
//     res.status(500).json({ message: error.message || 'Failed to add employee' });
//   }
// });

// app.get('/api/statistics', async (req, res) => {
//   try {
//     const totalEmployees = await Employee.countDocuments();
//     const totalTeamLeads = await Employee.countDocuments({ role: 'Team Lead' });
//     const totalDevelopers = await Employee.countDocuments({ role: 'Developer' });
//     const totalTeams = await Team.countDocuments();
    
//     res.json({ totalEmployees, totalTeamLeads, totalDevelopers, totalTeams });
//   } catch (error) {
//     console.error('Error getting statistics:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.get('/api/employees', async (req, res) => {
//   try {
//     const employees = await Employee.find({}, '-_id employeeId name email mobile role teamName');
//     res.json(employees);
//   } catch (error) {
//     console.error('Error getting employees:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.get('/api/available-members', async (req, res) => {
//   try {
//     // Get developers not assigned to any team
//     const members = await Employee.find(
//       { role: 'Developer', teamId: { $exists: false } },
//       'employeeId name role'
//     );
//     res.json(members);
//   } catch (error) {
//     console.error('Error getting available members:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.get('/api/teams', async (req, res) => {
//   try {
//     const teams = await Team.find({}, 'name leadName');
//     res.json(teams);
//   } catch (error) {
//     console.error('Error getting teams:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// app.put('/api/employees/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const { name, email, mobile, role, password, teamName, teamId } = req.body;

//     // Update employee record
//     const updateData = { name, email, mobile, role };
//     if (teamName) updateData.teamName = teamName;
//     if (teamId) updateData.teamId = teamId;

//     await Employee.updateOne({ employeeId }, { $set: updateData });

//     // Update password if provided
//     if (password) {
//       await Login.updateOne({ employeeId }, { $set: { password } });
//     }

//     // Handle team updates if role changed
//     if (role === 'Team Lead' && teamName) {
//       // Check if team already exists for this lead
//       const existingTeam = await Team.findOne({ leadId: employeeId });
//       if (existingTeam) {
//         await Team.updateOne(
//           { leadId: employeeId },
//           { $set: { name: teamName } }
//         );
//       } else {
//         const newTeam = new Team({
//           name: teamName,
//           leadId: employeeId,
//           leadName: name
//         });
//         await newTeam.save();
//       }
//     }

//     res.json({ success: true, message: 'Employee updated successfully' });
//   } catch (error) {
//     console.error('Error updating employee:', error);
//     res.status(500).json({ message: error.message || 'Failed to update employee' });
//   }
// });

// app.delete('/api/employees/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;

//     // Delete employee and login records
//     await Promise.all([
//       Employee.deleteOne({ employeeId }),
//       Login.deleteOne({ employeeId })
//     ]);

//     // Check if this employee was a team lead and delete their team
//     await Team.deleteOne({ leadId: employeeId });

//     // Remove this employee from any teams they were a member of
//     await Team.updateMany(
//       { memberIds: employeeId },
//       { $pull: { memberIds: employeeId } }
//     );

//     res.json({ success: true, message: 'Employee deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting employee:', error);
//     res.status(500).json({ message: error.message || 'Failed to delete employee' });
//   }
// });

// // Developer Dashboard APIs

// // Get employee data
// app.get('/api/employees/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const employee = await Employee.findOne({ employeeId });
    
//     if (!employee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }

//     res.json({
//       employee: {
//         name: employee.name,
//         role: employee.role,
//         teamName: employee.teamName
//       }
//     });
//   } catch (error) {
//     console.error('Error getting employee:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Get notifications
// app.get('/api/notifications/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const notifications = await Notification.find({ employeeId })
//       .sort({ createdAt: -1 })
//       .limit(10);
    
//     res.json(notifications);
//   } catch (error) {
//     console.error('Error getting notifications:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Mark notification as read
// app.put('/api/notifications/mark-read', async (req, res) => {
//   try {
//     const { employeeId, notificationId } = req.body;
    
//     await Notification.updateOne(
//       { _id: notificationId, employeeId },
//       { $set: { read: true } }
//     );
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error marking notification as read:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Get time tracking data
// app.get('/api/time-tracking/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     let timeTracking = await TimeTracking.findOne({ employeeId });
    
//     if (!timeTracking) {
//       // Create a new record if it doesn't exist
//       timeTracking = new TimeTracking({ employeeId });
//       await timeTracking.save();
//     }
    
//     res.json({
//       clockedIn: timeTracking.clockedIn,
//       lastClockIn: timeTracking.lastClockIn,
//       todayDuration: timeTracking.todayDuration,
//       weeklyTotal: timeTracking.weeklyTotal
//     });
//   } catch (error) {
//     console.error('Error getting time tracking data:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Clock in
// app.post('/api/time-tracking/clock-in', async (req, res) => {
//   try {
//     const { employeeId } = req.body;
    
//     if (!employeeId) {
//       return res.status(400).json({ message: 'Employee ID is required' });
//     }

//     const now = new Date();
//     let timeTracking = await TimeTracking.findOne({ employeeId });
    
//     if (!timeTracking) {
//       timeTracking = new TimeTracking({ employeeId });
//     }
    
//     if (timeTracking.clockedIn) {
//       return res.status(400).json({ message: 'Already clocked in' });
//     }
    
//     timeTracking.clockedIn = true;
//     timeTracking.lastClockIn = now;
//     timeTracking.sessions.push({
//       clockIn: now
//     });
    
//     await timeTracking.save();
    
//     res.json({
//       clockedIn: true,
//       lastClockIn: now,
//       todayDuration: timeTracking.todayDuration,
//       weeklyTotal: timeTracking.weeklyTotal
//     });
//   } catch (error) {
//     console.error('Error clocking in:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Clock out
// app.post('/api/time-tracking/clock-out', async (req, res) => {
//   try {
//     const { employeeId } = req.body;
    
//     if (!employeeId) {
//       return res.status(400).json({ message: 'Employee ID is required' });
//     }

//     const now = new Date();
//     const timeTracking = await TimeTracking.findOne({ employeeId });
    
//     if (!timeTracking || !timeTracking.clockedIn) {
//       return res.status(400).json({ message: 'Not clocked in' });
//     }
    
//     // Find the current session (last one without clockOut)
//     const currentSession = timeTracking.sessions.find(s => !s.clockOut);
    
//     if (currentSession) {
//       currentSession.clockOut = now;
//       const durationMs = now - currentSession.clockIn;
//       currentSession.duration = Math.floor(durationMs / (1000 * 60)); // in minutes
      
//       // Update today's duration
//       const todayMinutes = currentSession.duration;
//       const hours = Math.floor(todayMinutes / 60);
//       const minutes = todayMinutes % 60;
//       timeTracking.todayDuration = `${hours}h ${minutes}m`;
      
//       // Update weekly total (simplified - in a real app you'd aggregate all sessions for the week)
//       const weeklyMinutes = timeTracking.sessions
//         .filter(s => s.clockOut)
//         .reduce((sum, s) => sum + s.duration, 0);
//       const weeklyHours = Math.floor(weeklyMinutes / 60);
//       const weeklyMins = weeklyMinutes % 60;
//       timeTracking.weeklyTotal = `${weeklyHours}h ${weeklyMins}m`;
//     }
    
//     timeTracking.clockedIn = false;
//     await timeTracking.save();
    
//     res.json({
//       clockedIn: false,
//       lastClockIn: timeTracking.lastClockIn,
//       todayDuration: timeTracking.todayDuration,
//       weeklyTotal: timeTracking.weeklyTotal
//     });
//   } catch (error) {
//     console.error('Error clocking out:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Get availability
// app.get('/api/availability/:employeeId', async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     let availability = await Availability.findOne({ employeeId });
    
//     if (!availability) {
//       // Create default availability if it doesn't exist
//       availability = new Availability({
//         employeeId,
//         days: [
//           { id: 1, name: 'Monday', selected: false, hours: 9 },
//           { id: 2, name: 'Tuesday', selected: false, hours: 9 },
//           { id: 3, name: 'Wednesday', selected: false, hours: 9 },
//           { id: 4, name: 'Thursday', selected: false, hours: 9 },
//           { id: 5, name: 'Friday', selected: false, hours: 0 }
//         ],
//         submitted: false
//       });
//       await availability.save();
//     }
    
//     res.json(availability);
//   } catch (error) {
//     console.error('Error getting availability:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Submit availability
// app.post('/api/availability', async (req, res) => {
//   try {
//     const { employeeId, days } = req.body;
    
//     if (!employeeId) {
//       return res.status(400).json({ message: 'Employee ID is required' });
//     }

//     // Calculate total hours
//     const totalHours = days
//       .filter(day => day.selected)
//       .reduce((sum, day) => sum + day.hours, 0);
    
//     if (totalHours !== 36) {
//       return res.status(400).json({ 
//         message: `Total hours must be 36 (currently ${totalHours})` 
//       });
//     }
    
//     let availability = await Availability.findOne({ employeeId });
    
//     if (!availability) {
//       availability = new Availability({ employeeId });
//     }
    
//     availability.days = days;
//     availability.submitted = true;
    
//     await availability.save();
    
//     res.json(availability);
//   } catch (error) {
//     console.error('Error submitting availability:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// const PORT = 5001;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));