const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const moment = require('moment');
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const mongoURI = 'mongodb+srv://01fe22bcs259:Sagar@cluster0.v0jo1.mongodb.net/hrm_system';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Developer = require('./models/Developer');
const WorkLog = require('./models/WorkLog');
const Notification = require('./models/Notification');
const Availability = require('./models/Availability');

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '01fe22bcs259@kletech.ac.in',
    pass: 'swzk lukh byrh xema',
  }
});
//0 9 * * 1

// Schedule Monday 9 AM check for availability submissions
cron.schedule('20 13 * * 0', async () => {
  try {
    const developers = await Developer.find();
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();
    
    for (const dev of developers) {
      const availability = await Availability.findOne({
        developer: dev._id,
        week: currentWeek,
        year: currentYear
      });
      
      if (!availability || !availability.isSubmitted) {
        // Send reminder email
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: dev.email,
          subject: 'Urgent: Weekly Availability Not Submitted',
          html: `
            <p>Dear ${dev.name},</p>
            <p>You have not submitted your weekly availability yet. Please submit it immediately.</p>
            <p>You will receive reminders every 5 minutes until you submit your availability.</p>
            <p>HR Team</p>
          `
        });
        
        // Create notification
        await Notification.create({
          developer: dev._id,
          title: 'Availability Not Submitted',
          message: 'You have not submitted your weekly availability. Please submit it immediately.',
          type: 'reminder'
        });
        
        // Schedule every 5 minute reminders
        const reminderInterval = setInterval(async () => {
          const updatedAvailability = await Availability.findOne({
            developer: dev._id,
            week: currentWeek,
            year: currentYear
          });
          
          if (updatedAvailability && updatedAvailability.isSubmitted) {
            clearInterval(reminderInterval);
          } else {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: dev.email,
              subject: 'Reminder: Submit Weekly Availability',
              html: `
                <p>Dear ${dev.name},</p>
                <p>This is a reminder to submit your weekly availability.</p>
                <p>HR Team</p>
              `
            });
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
  } catch (error) {
    console.error('Error in Monday 9 AM cron job:', error);
  }
});
// Developer Login API
app.post('/api/login/developer', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    
    // Validate input
    if (!employeeId || !password) {
      return res.status(400).json({ 
        message: 'Employee ID and password are required' 
      });
    }

    // Find developer in database
    const developer = await Developer.findOne({ employeeId });
    
    if (!developer) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // In a real application, you would hash the password and compare
    // For this example, we're doing direct comparison
    if (developer.password !== password) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Create a simple token (in production, use JWT)
    const token = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Return success response with developer data (excluding password)
    const developerData = {
      _id: developer._id,
      name: developer.name,
      email: developer.email,
      employeeId: developer.employeeId,
      role: developer.role
    };

    res.json({
      message: 'Login successful',
      token,
      employee: developerData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'An error occurred during login' 
    });
  }
});
// Routes

// Developer Login
// app.post('/api/login/developer', async (req, res) => {
//   try {
//     const { employeeId, password } = req.body;
    
//     // In a real app, you would hash the password and compare
//     const developer = await Developer.findOne({ employeeId, password });
    
//     if (!developer) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }
    
//     // In a real app, you would use JWT or sessions
//     const token = 'simulated-token-' + Math.random().toString(36).substring(2);
    
//     res.json({
//       token,
//       employee: {
//         _id: developer._id,
//         name: developer.name,
//         email: developer.email,
//         employeeId: developer.employeeId,
//         role: developer.role
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// Get Developer Dashboard Data
app.get('/api/developer/:id/dashboard', async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);
    if (!developer) {
      return res.status(404).json({ message: 'Developer not found' });
    }
    
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();
    
    const availability = await Availability.findOne({
      developer: req.params.id,
      week: currentWeek,
      year: currentYear
    });
    
    const workLogs = await WorkLog.find({
      developer: req.params.id
    }).sort({ date: -1 }).limit(10);
    
    const notifications = await Notification.find({
      developer: req.params.id,
      isRead: false
    }).sort({ createdAt: -1 }).limit(5);
    
    // Calculate planned vs actual for the week
    const plannedVsActual = await calculatePlannedVsActual(req.params.id, currentWeek, currentYear);
    
    // Get today's work status
    const todayLog = await getTodayWorkStatus(req.params.id);
    
    // Calculate productivity score
    const productivity = await calculateProductivityScore(req.params.id);
    
    res.json({
      developer,
      availability: availability ? availability.availability : {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
        Friday: [], Saturday: [], Sunday: []
      },
      isAvailabilitySubmitted: availability ? availability.isSubmitted : false,
      workLogs,
      notifications,
      comparison: plannedVsActual,
      todayLog,
      productivityScore: productivity.score,
      productivityTips: productivity.tips
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Developer Availability


// Submit Developer Availability
app.get('/api/developer/:id/availability', async (req, res) => {
  try {
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();
    
    // Add input validation
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid developer ID' });
    }

    const availability = await Availability.findOne({
      developer: req.params.id,
      week: currentWeek,
      year: currentYear
    });

    // Return consistent structure whether found or not
    const response = {
      availability: {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      },
      isSubmitted: false
    };

    if (availability) {
      response.availability = availability.availability;
      response.isSubmitted = availability.isSubmitted;
    }

    res.json(response);
    
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ 
      message: 'Error fetching availability data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/developer/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();

    // Validate input
    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({ message: 'Invalid availability data' });
    }

    // Validate all days are present
    const requiredDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of requiredDays) {
      if (!availability[day] || !Array.isArray(availability[day])) {
        return res.status(400).json({ message: `Invalid data for ${day}` });
      }
    }

    // Calculate total hours
    let totalHours = 0;
    let daysWithAvailability = 0;

    for (const day of requiredDays) {
      for (const slot of availability[day]) {
        if (!slot.startTime || !slot.endTime) {
          return res.status(400).json({ message: `Missing time for ${day} slot` });
        }

        const start = moment(slot.startTime, 'HH:mm');
        const end = moment(slot.endTime, 'HH:mm');
        
        if (!start.isValid() || !end.isValid()) {
          return res.status(400).json({ message: `Invalid time format for ${day}` });
        }

        if (end.isBefore(start)) {
          return res.status(400).json({ message: `End time before start time for ${day}` });
        }

        totalHours += end.diff(start, 'hours', true);
      }

      if (availability[day].length > 0) {
        daysWithAvailability++;
      }
    }

    // Business rule validation
    if (totalHours < 36) {
      return res.status(400).json({ 
        message: `Minimum 36 hours required (currently ${totalHours.toFixed(1)} hours)`
      });
    }

    if (daysWithAvailability < 4) {
      return res.status(400).json({ 
        message: `At least 4 days with availability required (currently ${daysWithAvailability} days)`
      });
    }

    // Upsert the availability
    const updatedAvailability = await Availability.findOneAndUpdate(
      {
        developer: req.params.id,
        week: currentWeek,
        year: currentYear
      },
      {
        availability,
        isSubmitted: true,
        submittedAt: new Date()
      },
      {
        new: true,
        upsert: true, // Creates if doesn't exist
        setDefaultsOnInsert: true
      }
    );

    res.json({
      message: 'Availability saved successfully',
      availability: updatedAvailability.availability,
      isSubmitted: updatedAvailability.isSubmitted
    });

  } catch (error) {
    console.error('Availability save error:', error);
    res.status(500).json({ 
      message: 'Error saving availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// // Developer Login (start work session)
// app.post('/api/developer/:id/login', async (req, res) => {
//   try {
//     const today = moment().startOf('day');
    
//     // Check if there's an existing log for today
//     let workLog = await WorkLog.findOne({
//       developer: req.params.id,
//       date: {
//         $gte: today.toDate(),
//         $lt: moment(today).endOf('day').toDate()
//       }
//     });
    
//     if (workLog && workLog.loginTime && !workLog.logoutTime) {
//       return res.status(400).json({ message: 'You are already logged in' });
//     }
    
//     if (!workLog) {
//       workLog = new WorkLog({
//         developer: req.params.id,
//         date: new Date(),
//         loginTime: new Date()
//       });
//     } else {
//       workLog.loginTime = new Date();
//       workLog.logoutTime = null;
//       workLog.durationMinutes = 0;
//     }
    
//     await workLog.save();
    
//     res.json({
//       message: 'Work session started',
//       todayLog: {
//         loginTime: workLog.loginTime,
//         logoutTime: workLog.logoutTime,
//         isWorking: true
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// // Developer Logout (end work session)
// app.post('/api/developer/:id/logout', async (req, res) => {
//   try {
//     const today = moment().startOf('day');
    
//     const workLog = await WorkLog.findOne({
//       developer: req.params.id,
//       date: {
//         $gte: today.toDate(),
//         $lt: moment(today).endOf('day').toDate()
//       }
//     });
    
//     if (!workLog || !workLog.loginTime) {
//       return res.status(400).json({ message: 'No active work session found' });
//     }
    
//     if (workLog.logoutTime) {
//       return res.status(400).json({ message: 'You are already logged out' });
//     }
    
//     workLog.logoutTime = new Date();
//     workLog.durationMinutes = moment(workLog.logoutTime).diff(moment(workLog.loginTime), 'minutes');
//     await workLog.save();
    
//     res.json({
//       message: 'Work session ended',
//       todayLog: {
//         loginTime: workLog.loginTime,
//         logoutTime: workLog.logoutTime,
//         isWorking: false,
//         durationMinutes: workLog.durationMinutes
//       }
//     });
//   } catch (error) {
//     console.error('Logout error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// Update login endpoint
app.post('/api/developer/:id/login', async (req, res) => {
  try {
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();

    // Debug log
    console.log(`Developer ${req.params.id} login attempt at ${new Date()}`);

    let workLog = await WorkLog.findOne({
      developer: req.params.id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (workLog && !workLog.logoutTime) {
      console.log('Login denied - already logged in');
      return res.status(400).json({ message: 'You are already logged in' });
    }

    if (!workLog) {
      workLog = new WorkLog({
        developer: req.params.id,
        date: new Date(),
        loginTime: new Date()
      });
    } else {
      workLog.loginTime = new Date();
      workLog.logoutTime = null;
      workLog.durationMinutes = 0;
    }

    await workLog.save();
    console.log(`Login recorded for developer ${req.params.id}`);

    res.json({
      message: 'Work session started',
      todayLog: {
        loginTime: workLog.loginTime,
        logoutTime: workLog.logoutTime,
        isWorking: true
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update logout endpoint
app.post('/api/developer/:id/logout', async (req, res) => {
  try {
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();

    // Debug log
    console.log(`Developer ${req.params.id} logout attempt at ${new Date()}`);

    const workLog = await WorkLog.findOne({
      developer: req.params.id,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (!workLog || !workLog.loginTime) {
      console.log('Logout denied - no active session');
      return res.status(400).json({ message: 'No active work session found' });
    }

    if (workLog.logoutTime) {
      console.log('Logout denied - already logged out');
      return res.status(400).json({ message: 'You are already logged out' });
    }

    workLog.logoutTime = new Date();
    workLog.durationMinutes = moment(workLog.logoutTime).diff(moment(workLog.loginTime), 'minutes');
    
    await workLog.save();
    console.log(`Logout recorded for developer ${req.params.id}`);

    res.json({
      message: 'Work session ended',
      todayLog: {
        loginTime: workLog.loginTime,
        logoutTime: workLog.logoutTime,
        isWorking: false,
        durationMinutes: workLog.durationMinutes
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get Today's Work Status
app.get('/api/developer/:id/today-status', async (req, res) => {
  try {
    const today = moment().startOf('day');
    
    const workLog = await WorkLog.findOne({
      developer: req.params.id,
      date: {
        $gte: today.toDate(),
        $lt: moment(today).endOf('day').toDate()
      }
    }).sort({ loginTime: -1 });

    if (!workLog) {
      return res.json({
        todayLog: {
          loginTime: null,
          logoutTime: null,
          isWorking: false,
          durationMinutes: 0
        }
      });
    }

    res.json({
      todayLog: {
        loginTime: workLog.loginTime,
        logoutTime: workLog.logoutTime,
        isWorking: workLog.loginTime && !workLog.logoutTime,
        durationMinutes: workLog.durationMinutes || 0
      }
    });
  } catch (error) {
    console.error('Today status error:', error);
    res.status(500).json({ 
      message: 'Error fetching today status',
      error: error.message 
    });
  }
});


// Get Developer Work Logs
app.get('/api/developer/:id/worklogs', async (req, res) => {
  try {
    const workLogs = await WorkLog.find({
      developer: req.params.id
    }).sort({ date: -1 });
    
    res.json({ workLogs });
  } catch (error) {
    console.error('Work logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Developer Notifications
app.get('/api/developer/:id/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({
      developer: req.params.id
    }).sort({ createdAt: -1 }).limit(20);
    
    const unreadCount = await Notification.countDocuments({
      developer: req.params.id,
      isRead: false
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark Notification as Read
app.put('/api/developer/:id/notifications/:notificationId/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        developer: req.params.id
      },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    const unreadCount = await Notification.countDocuments({
      developer: req.params.id,
      isRead: false
    });
    
    res.json({ notification, unreadCount });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Planned vs Actual Comparison
app.get('/api/developer/:id/planned-vs-actual', async (req, res) => {
  try {
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();
    
    const comparison = await calculatePlannedVsActual(req.params.id, currentWeek, currentYear);
    
    res.json({ 
      success: true,
      comparison,
      week: currentWeek,
      year: currentYear
    });
  } catch (error) {
    console.error('Planned vs actual error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error calculating planned vs actual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Productivity Score
// app.get('/api/developer/:id/productivity', async (req, res) => {
//   try {
//     const currentWeek = moment().isoWeek();
//     const currentYear = moment().year();
    
//     // Get planned vs actual data
//     const plannedVsActual = await calculatePlannedVsActual(req.params.id, currentWeek, currentYear);
    
//     // Calculate overall productivity score
//     let totalPlanned = 0;
//     let totalActual = 0;
    
//     plannedVsActual.forEach(day => {
//       totalPlanned += day.plannedMinutes;
//       totalActual += day.actualMinutes;
//     });
    
//     let productivityScore = 0;
//     if (totalPlanned > 0) {
//       productivityScore = Math.min(100, Math.round((totalActual / totalPlanned) * 100));
//     }
    
//     // Generate productivity tips based on score
//     const tips = [];
    
//     if (productivityScore < 60) {
//       tips.push(
//         'Try to minimize distractions during work hours',
//         'Align your work sessions with your most productive times',
//         'Break large tasks into smaller, manageable chunks',
//         'Communicate blockers to your manager early'
//       );
//     } else if (productivityScore < 80) {
//       tips.push(
//         'Reduce context switching between tasks',
//         'Schedule focus blocks in your calendar',
//         'Take regular breaks to maintain energy'
//       );
//     } else {
//       tips.push(
//         'Consider mentoring others',
//         'Look for opportunities to take on stretch goals',
//         'Share your productivity techniques with the team'
//       );
//     }
    
//     res.json({
//       score: productivityScore,
//       tips
//     });
//   } catch (error) {
//     console.error('Productivity error:', error);
//     res.status(500).json({ 
//       message: 'Error calculating productivity',
//       error: error.message 
//     });
//   }
// });

// // Update the productivity calculation endpoint
// app.get('/api/developer/:id/productivity', async (req, res) => {
//   try {
//     const developerId = req.params.id;
    
//     // Verify developer exists
//     const developer = await Developer.findById(developerId);
//     if (!developer) {
//       return res.status(404).json({ message: 'Developer not found' });
//     }

//     const currentWeek = moment().isoWeek();
//     const currentYear = moment().year();
    
//     // Get planned vs actual with better error handling
//     let comparison;
//     try {
//       comparison = await calculatePlannedVsActual(developerId, currentWeek, currentYear);
//     } catch (error) {
//       console.error('Error calculating planned vs actual:', error);
//       comparison = [];
//     }

//     // Calculate overall productivity score with fallbacks
//     let totalPlanned = 0;
//     let totalActual = 0;
    
//     comparison.forEach(day => {
//       totalPlanned += day.plannedMinutes || 0;
//       totalActual += day.actualMinutes || 0;
//     });
    
//     let productivityScore = 0;
//     let productivityMessage = 'No productivity data available';
    
//     if (totalPlanned > 0) {
//       productivityScore = Math.min(100, Math.round((totalActual / totalPlanned) * 100));
//       productivityMessage = totalActual > 0 ? 
//         'Productivity calculated' : 
//         'No work sessions recorded';
//     }

//     // Generate productivity tips with more context
//     const tips = generateProductivityTips(productivityScore, totalActual);
    
//     res.json({
//       success: true,
//       score: productivityScore,
//       message: productivityMessage,
//       tips,
//       meta: {
//         totalPlannedMinutes: totalPlanned,
//         totalActualMinutes: totalActual,
//         week: currentWeek,
//         year: currentYear
//       }
//     });

//   } catch (error) {
//     console.error('Productivity calculation error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Error calculating productivity',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });

// Improved helper function
// async function calculatePlannedVsActual(developerId, week, year) {
//   const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//   const comparison = [];

//   // Get availability once for the whole week
//   const availability = await Availability.findOne({
//     developer: developerId,
//     week,
//     year
//   });

//   for (const day of daysOfWeek) {
//     // Calculate planned minutes with better null checks
//     let plannedMinutes = 0;
//     if (availability?.availability?.[day]) {
//       availability.availability[day].forEach(slot => {
//         try {
//           const start = moment(slot.startTime, 'HH:mm');
//           const end = moment(slot.endTime, 'HH:mm');
//           plannedMinutes += end.diff(start, 'minutes');
//         } catch (e) {
//           console.error(`Invalid time slot for ${day}:`, slot);
//         }
//       });
//     }

//     // Calculate actual minutes with date range check
//     const dayStart = moment().isoWeek(week).year(year).isoWeekday(day).startOf('day');
//     const dayEnd = moment(dayStart).endOf('day');
    
//     let actualMinutes = 0;
//     try {
//       const workLogs = await WorkLog.find({
//         developer: developerId,
//         date: { $gte: dayStart.toDate(), $lt: dayEnd.toDate() },
//         logoutTime: { $ne: null }
//       });

//       workLogs.forEach(log => {
//         actualMinutes += log.durationMinutes || 0;
//       });
//     } catch (error) {
//       console.error(`Error fetching work logs for ${day}:`, error);
//     }

//     comparison.push({
//       day,
//       plannedMinutes,
//       actualMinutes,
//       productivity: plannedMinutes > 0 ? 
//         Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100)) : 0
//     });
//   }

//   return comparison;
// }
async function calculatePlannedVsActual(developerId, week, year) {
  try {
    // Verify developer exists
    const developer = await Developer.findById(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const comparison = [];

    // Get availability for the week
    const availability = await Availability.findOne({
      developer: developerId,
      week,
      year
    });

    // Process each day
    for (const day of daysOfWeek) {
      // Calculate planned minutes
      let plannedMinutes = 0;
      if (availability?.availability?.[day]?.length > 0) {
        for (const slot of availability.availability[day]) {
          try {
            const start = moment(slot.startTime, 'HH:mm');
            const end = moment(slot.endTime, 'HH:mm');
            
            if (!start.isValid() || !end.isValid()) {
              console.warn(`Invalid time format for ${day} slot:`, slot);
              continue;
            }
            
            if (end.isSameOrBefore(start)) {
              console.warn(`End time before start time for ${day} slot:`, slot);
              continue;
            }
            
            plannedMinutes += end.diff(start, 'minutes');
          } catch (e) {
            console.error(`Error processing slot for ${day}:`, e);
          }
        }
      }

      // Calculate actual minutes
      let actualMinutes = 0;
      try {
        const dayStart = moment().set({week, year}).isoWeekday(day).startOf('day').utc();
        const dayEnd = moment(dayStart).endOf('day').utc();
        
        const workLogs = await WorkLog.find({
          developer: developerId,
          date: { 
            $gte: dayStart.toDate(), 
            $lte: dayEnd.toDate() 
          }
        });

        for (const log of workLogs) {
          if (log.logoutTime) {
            // Completed session
            actualMinutes += log.durationMinutes || 0;
          } else if (log.loginTime) {
            // Ongoing session
            const sessionEnd = moment().utc();
            const sessionStart = moment(log.loginTime).utc();
            actualMinutes += sessionEnd.diff(sessionStart, 'minutes');
          }
        }
      } catch (error) {
        console.error(`Error fetching work logs for ${day}:`, error);
      }

      // Calculate productivity
      let productivity = 0;
      if (plannedMinutes > 0) {
        productivity = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
      }

      comparison.push({
        day,
        plannedMinutes,
        actualMinutes,
        productivity
      });
    }

    return comparison;

  } catch (error) {
    console.error('Error in calculatePlannedVsActual:', error);
    // Return default structure on error
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .map(day => ({ 
        day, 
        plannedMinutes: 0, 
        actualMinutes: 0, 
        productivity: 0 
      }));
  }
}

// New helper function for tips
function generateProductivityTips(score, totalActual) {
  const tips = [];
  
  if (totalActual === 0) {
    tips.push(
      'No work sessions recorded this week',
      'Make sure to log in and out of your work sessions',
      'Contact support if you believe this is incorrect'
    );
    return tips;
  }

  if (score < 60) {
    tips.push(
      'Try to minimize distractions during work hours',
      'Align work sessions with your most productive times',
      'Break large tasks into smaller chunks',
      'Communicate blockers early'
    );
  } else if (score < 80) {
    tips.push(
      'Reduce context switching between tasks',
      'Schedule focus blocks in your calendar',
      'Take regular breaks to maintain energy'
    );
  } else {
    tips.push(
      'Consider mentoring others',
      'Look for opportunities to take on stretch goals',
      'Share your productivity techniques with the team'
    );
  }

  return tips;
}

// Helper function for planned vs actual calculation
// async function calculatePlannedVsActual(developerId, week, year) {
//   const availability = await Availability.findOne({
//     developer: developerId,
//     week,
//     year
//   });

//   const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//   const comparison = [];

//   for (const day of daysOfWeek) {
//     // Calculate planned minutes
//     let plannedMinutes = 0;
//     if (availability && availability.availability[day]) {
//       availability.availability[day].forEach(slot => {
//         const start = moment(slot.startTime, 'HH:mm');
//         const end = moment(slot.endTime, 'HH:mm');
//         plannedMinutes += end.diff(start, 'minutes');
//       });
//     }

//     // Calculate actual minutes
//     const dayStart = moment().isoWeek(week).year(year).isoWeekday(day).startOf('day');
//     const dayEnd = moment(dayStart).endOf('day');
    
//     const workLogs = await WorkLog.find({
//       developer: developerId,
//       date: {
//         $gte: dayStart.toDate(),
//         $lt: dayEnd.toDate()
//       },
//       logoutTime: { $ne: null }
//     });

//     let actualMinutes = 0;
//     workLogs.forEach(log => {
//       actualMinutes += log.durationMinutes || 0;
//     });

//     // Calculate productivity percentage (if planned > 0)
//     let productivity = 0;
//     if (plannedMinutes > 0) {
//       productivity = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
//     }

//     comparison.push({
//       day,
//       plannedMinutes,
//       actualMinutes,
//       productivity
//     });
//   }

//   return comparison;
// }
// Replace all versions of calculatePlannedVsActual with this single version:
async function calculatePlannedVsActual(developerId, week, year) {
  try {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const comparison = [];

    // Get availability for the week
    const availability = await Availability.findOne({
      developer: developerId,
      week,
      year
    });

    // Get all work logs for the week
    const weekStart = moment().set({week, year}).startOf('week').utc();
    const weekEnd = moment(weekStart).endOf('week').utc();
    
    const workLogs = await WorkLog.find({
      developer: developerId,
      date: { 
        $gte: weekStart.toDate(), 
        $lte: weekEnd.toDate() 
      }
    });

    // Process each day
    for (const day of daysOfWeek) {
      const dayIndex = daysOfWeek.indexOf(day);
      const dayStart = moment(weekStart).add(dayIndex, 'days').utc();
      const dayEnd = moment(dayStart).endOf('day').utc();

      // Calculate planned minutes
      let plannedMinutes = 0;
      if (availability?.availability?.[day]?.length > 0) {
        for (const slot of availability.availability[day]) {
          try {
            const start = moment(slot.startTime, 'HH:mm');
            const end = moment(slot.endTime, 'HH:mm');
            
            if (!start.isValid() || !end.isValid()) continue;
            if (end.isSameOrBefore(start)) continue;
            
            plannedMinutes += end.diff(start, 'minutes');
          } catch (e) {
            console.error(`Error processing slot for ${day}:`, e);
          }
        }
      }

      // Calculate actual minutes
      let actualMinutes = 0;
      const dayLogs = workLogs.filter(log => 
        moment(log.date).utc().isBetween(dayStart, dayEnd, null, '[]')
      );

      for (const log of dayLogs) {
        if (log.logoutTime) {
          // Completed session
          actualMinutes += log.durationMinutes || 0;
        } else if (log.loginTime) {
          // Ongoing session
          const sessionEnd = moment().utc();
          const sessionStart = moment(log.loginTime).utc();
          actualMinutes += sessionEnd.diff(sessionStart, 'minutes');
        }
      }

      // Calculate productivity percentage
      let productivity = 0;
      if (plannedMinutes > 0) {
        productivity = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
      }

      comparison.push({
        day,
        plannedMinutes,
        actualMinutes,
        productivity
      });
    }

    return comparison;
  } catch (error) {
    console.error('Error in calculatePlannedVsActual:', error);
    // Return default structure with all days
    return daysOfWeek.map(day => ({
      day,
      plannedMinutes: 0,
      actualMinutes: 0,
      productivity: 0
    }));
  }
}

// Update the productivity endpoint:
app.get('/api/developer/:id/productivity', async (req, res) => {
  try {
    const developerId = req.params.id;
    const currentWeek = moment().isoWeek();
    const currentYear = moment().year();
    
    const comparison = await calculatePlannedVsActual(developerId, currentWeek, currentYear);
    
    // Calculate totals
    const totalPlanned = comparison.reduce((sum, day) => sum + day.plannedMinutes, 0);
    const totalActual = comparison.reduce((sum, day) => sum + day.actualMinutes, 0);
    
    // Calculate score
    let score = 0;
    let message = 'No data available';
    if (totalPlanned > 0) {
      score = Math.min(100, Math.round((totalActual / totalPlanned) * 100));
      message = totalActual > 0 ? 'Productivity calculated' : 'No work sessions recorded';
    }

    // Generate tips
    const tips = generateProductivityTips(score, totalActual);
    
    res.json({
      success: true,
      score,
      message,
      tips,
      comparison, // Include the full comparison data
      meta: {
        totalPlannedMinutes: totalPlanned,
        totalActualMinutes: totalActual,
        week: currentWeek,
        year: currentYear
      }
    });
  } catch (error) {
    console.error('Productivity calculation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error calculating productivity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Submit Feedback
// Submit Feedback
app.post('/api/developer/:id/feedback', async (req, res) => {
  try {
    const { feedback } = req.body;
    
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ 
        message: 'Feedback text is required' 
      });
    }

    // In a real app, you would save this to a database
    console.log(`Feedback from developer ${req.params.id}:`, feedback.trim());
    
    // Send email to HR (if configured)
    if (process.env.EMAIL_USER && process.env.HR_EMAIL) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.HR_EMAIL,
        subject: `New Feedback from Developer ${req.params.id}`,
        text: feedback.trim()
      });
    }
    
    res.json({ 
      message: 'Feedback submitted successfully' 
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ 
      message: 'Failed to submit feedback',
      error: error.message 
    });
  }
});

// Helper Functions

// async function calculatePlannedVsActual(developerId, week, year) {
//   const availability = await Availability.findOne({
//     developer: developerId,
//     week,
//     year
//   });
  
//   const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//   const comparison = [];
  
//   for (const day of daysOfWeek) {
//     // Calculate planned minutes
//     let plannedMinutes = 0;
//     if (availability && availability.availability[day]) {
//       availability.availability[day].forEach(slot => {
//         const start = moment(slot.startTime, 'HH:mm');
//         const end = moment(slot.endTime, 'HH:mm');
//         plannedMinutes += end.diff(start, 'minutes');
//       });
//     }
    
//     // Calculate actual minutes
//     const dayStart = moment().isoWeek(week).year(year).isoWeekday(day).startOf('day');
//     const dayEnd = moment(dayStart).endOf('day');
    
//     const workLogs = await WorkLog.find({
//       developer: developerId,
//       date: {
//         $gte: dayStart.toDate(),
//         $lt: dayEnd.toDate()
//       },
//       logoutTime: { $ne: null }
//     });
    
//     let actualMinutes = 0;
//     workLogs.forEach(log => {
//       actualMinutes += log.durationMinutes || 0;
//     });
    
//     // Calculate productivity percentage (if planned > 0)
//     let productivity = 0;
//     if (plannedMinutes > 0) {
//       productivity = Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100));
//     }
    
//     comparison.push({
//       day,
//       plannedMinutes,
//       actualMinutes,
//       productivity
//     });
//   }
  
//   return comparison;
// }

async function calculateProductivityScore(developerId) {
  const currentWeek = moment().isoWeek();
  const currentYear = moment().year();
  
  const comparison = await calculatePlannedVsActual(developerId, currentWeek, currentYear);
  
  // Calculate overall productivity score
  let totalPlanned = 0;
  let totalActual = 0;
  
  comparison.forEach(day => {
    totalPlanned += day.plannedMinutes;
    totalActual += day.actualMinutes;
  });
  
  let productivityScore = 0;
  if (totalPlanned > 0) {
    productivityScore = Math.min(100, Math.round((totalActual / totalPlanned) * 100));
  }
  
  // Generate productivity tips based on score
  const tips = [];
  
  if (productivityScore < 60) {
    tips.push(
      'Try to minimize distractions during work hours',
      'Align your work sessions with your most productive times',
      'Break large tasks into smaller, manageable chunks',
      'Communicate blockers to your manager early'
    );
  } else if (productivityScore < 80) {
    tips.push(
      'Reduce context switching between tasks',
      'Schedule focus blocks in your calendar',
      'Take regular breaks to maintain energy'
    );
  } else {
    tips.push(
      'Consider mentoring others',
      'Look for opportunities to take on stretch goals',
      'Share your productivity techniques with the team'
    );
  }
  
  return {
    score: productivityScore,
    tips
  };
}

async function getTodayWorkStatus(developerId) {
  const today = moment().startOf('day');
  
  const workLog = await WorkLog.findOne({
    developer: developerId,
    date: {
      $gte: today.toDate(),
      $lt: moment(today).endOf('day').toDate()
    }
  });
  
  if (!workLog) {
    return {
      loginTime: null,
      logoutTime: null,
      isWorking: false,
      durationMinutes: 0
    };
  }
  
  return {
    loginTime: workLog.loginTime,
    logoutTime: workLog.logoutTime,
    isWorking: workLog.loginTime && !workLog.logoutTime,
    durationMinutes: workLog.durationMinutes || 0
  };
}
///////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////
// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
