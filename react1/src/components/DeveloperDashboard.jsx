import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CSS/DeveloperDashboard.css';
import moment from 'moment';
import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [availability, setAvailability] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });
  const [workLogs, setWorkLogs] = useState([]);
  const [todayLog, setTodayLog] = useState({
    loginTime: null,
    logoutTime: null,
    isWorking: false
  });
  const [notifications, setNotifications] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [plannedVsActual, setPlannedVsActual] = useState([]);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [newNotification, setNewNotification] = useState({ title: '', message: '' });
  const [timeLeftForSubmission, setTimeLeftForSubmission] = useState('');
  const [isAvailabilitySubmitted, setIsAvailabilitySubmitted] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(moment().isoWeek());
  const [currentYear, setCurrentYear] = useState(moment().year());
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState({ day: 'Monday', startTime: '', endTime: '' });
  const [activeDay, setActiveDay] = useState(moment().format('dddd'));
  const [productivityScore, setProductivityScore] = useState(0);
  const [showProductivityTips, setShowProductivityTips] = useState(false);
  const [productivityTips, setProductivityTips] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  const availabilityFormRef = useRef(null);
  const notificationBellRef = useRef(null);
  const timeSlotModalRef = useRef(null);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const devData = localStorage.getItem('developer');
      const token = localStorage.getItem('devAuthToken');
      
      if (!devData || !token) {
        navigate('/developer-login');
        return;
      }
      
      try {
        setDeveloper(JSON.parse(devData));
        await fetchInitialData(JSON.parse(devData)._id);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/developer-login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up interval for checking Monday 9 AM deadline
    const deadlineCheckInterval = setInterval(checkAvailabilityDeadline, 60000); // Check every minute
    
    return () => {
      clearInterval(deadlineCheckInterval);
    };
  }, [navigate]);

  // Fetch initial data
 const fetchInitialData = async (developerId) => {
  try {
    const [
      availabilityRes, 
      workLogsRes, 
      notificationsRes, 
      plannedActualRes,
      todayStatusRes,
      productivityRes
    ] = await Promise.all([
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/availability`),
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/worklogs`),
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/notifications`),
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/planned-vs-actual`),
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/today-status`),
      axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/productivity`)
    ]);

    // Ensure plannedVsActual always has valid data
    const plannedActualData = plannedActualRes.data.comparison || 
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        .map(day => ({ day, plannedMinutes: 0, actualMinutes: 0, productivity: 0 }));

    setAvailability(availabilityRes.data.availability || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], 
      Friday: [], Saturday: [], Sunday: []
    });
    setWorkLogs(workLogsRes.data.workLogs || []);
    setNotifications(notificationsRes.data.notifications || []);
    setPlannedVsActual(plannedActualData);
    setTodayLog(todayStatusRes.data.todayLog || {
      loginTime: null,
      logoutTime: null,
      isWorking: false,
      durationMinutes: 0
    });
    setProductivityScore(productivityRes.data.score || 0);
    setProductivityTips(productivityRes.data.tips || []);
    setUnreadNotifications(notificationsRes.data.unreadCount || 0);

    calculateWeeklyHours(availabilityRes.data.availability || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], 
      Friday: [], Saturday: [], Sunday: []
    });
    setIsAvailabilitySubmitted(availabilityRes.data.isSubmitted || false);
    
    checkAvailabilityDeadline();
  } catch (error) {
    console.error('Error fetching initial data:', error);
    toast.error('Failed to load dashboard data');
    
    // Set default values on error
    setPlannedVsActual(
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        .map(day => ({ day, plannedMinutes: 0, actualMinutes: 0, productivity: 0 }))
    );
    setAvailability({
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], 
      Friday: [], Saturday: [], Sunday: []
    });
    setIsAvailabilitySubmitted(false);
  }
};
  // Frontend example
  // 1. State initialization
// const [availability, setAvailability] = useState({
//   Monday: [],
//   Tuesday: [],
//   Wednesday: [],
//   Thursday: [],
//   Friday: [],
//   Saturday: [],
//   Sunday: []
// });
// const [isAvailabilitySubmitted, setIsAvailabilitySubmitted] = useState(false);

// 2. Enhanced data fetching
const fetchAvailabilityData = async (developerId) => {
  try {
    const response = await axios.get(`https://hrm-system-vm5e.onrender.com/api/developer/${developerId}/availability`);

    setAvailability(response.data.availability);
    setIsAvailabilitySubmitted(response.data.isSubmitted);
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    // Reset to default if fetch fails
    setAvailability({
      Monday: [], Tuesday: [], Wednesday: [],
      Thursday: [], Friday: [], Saturday: [], Sunday: []
    });
    setIsAvailabilitySubmitted(false);
  }
};

// 3. Save availability handler
const handleSaveAvailability = async (availabilityData) => {
  try {
    const response = await axios.post(
      `/api/developer/${developer._id}/availability`,
      { availability: availabilityData }
    );
    
    setAvailability(response.data.availability);
    setIsAvailabilitySubmitted(response.data.isSubmitted);
    toast.success('Availability saved successfully!');
    return true;
  } catch (error) {
    console.error('Save failed:', error);
    toast.error(error.response?.data?.message || 'Failed to save availability');
    return false;
  }
};

// 4. Load data on component mount and auth change
useEffect(() => {
  const loadData = async () => {
    if (developer?._id) {
      await fetchAvailabilityData(developer._id);
    }
  };
  
  loadData();
}, [developer?._id]); // Re-run when developer ID changes

// Frontend example
const saveAvailability = async (developerId, availabilityData) => {
  try {
    const response = await axios.post(
      `/api/developer/${developerId}/availability`,
      { availability: availabilityData }
    );
    return response.data;
  } catch (error) {
    console.error('Save error:', error);
    throw error; // Let the calling component handle the error
  }
};

  // Calculate total weekly hours from availability
  const calculateWeeklyHours = (avail) => {
    let totalHours = 0;
    Object.values(avail).forEach(day => {
      day.forEach(slot => {
        const start = moment(slot.startTime, 'HH:mm');
        const end = moment(slot.endTime, 'HH:mm');
        totalHours += end.diff(start, 'hours', true);
      });
    });
    setWeeklyHours(totalHours);
  };

  // Check if it's Monday before 9 AM and availability not submitted
  const checkAvailabilityDeadline = () => {
    const now = moment();
    const nextMonday9AM = moment().startOf('isoWeek').add(1, 'week').set({ hour: 9, minute: 0, second: 0 });
    
    // If it's Monday before 9 AM and availability not submitted
    if (now.isoWeekday() === 1 && now.isBefore(nextMonday9AM) && !isAvailabilitySubmitted) {
      const diff = nextMonday9AM.diff(now);
      const duration = moment.duration(diff);
      const hours = duration.hours();
      const minutes = duration.minutes();
      setTimeLeftForSubmission(`${hours}h ${minutes}m`);
      
      // If less than 1 hour left, show urgent warning
      if (diff < 3600000) {
        toast.warning(`Urgent: Only ${hours}h ${minutes}m left to submit weekly availability!`);
      }
    } else {
      setTimeLeftForSubmission('');
    }
  };

  // Handle login/logout
  const handleWorkToggle = async () => {
    try {
      if (todayLog.isWorking) {
        // Logout
        const response = await axios.post(`https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/logout`);
        setTodayLog(response.data.todayLog);
        toast.success('Logged out successfully');
      } else {
        // Login
        const response = await axios.post(`https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/login`);
        setTodayLog(response.data.todayLog);
        toast.success('Logged in successfully');
        
        // Show productivity tips if score is low
        if (productivityScore < 60) {
          setShowProductivityTips(true);
        }
      }
    } catch (error) {
      console.error('Error toggling work status:', error);
      toast.error(error.response?.data?.message || 'Failed to update work status');
    }
  };

  // Handle availability submission
  const handleAvailabilitySubmit = async (e) => {
    e.preventDefault();
    
    if (weeklyHours < 36) {
      toast.error('Total weekly availability must be at least 36 hours');
      return;
    }
    
    try {
      const response = await axios.post(
        `https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/availability`,
        { availability }
      );
      
      setAvailability(response.data.availability);
      setIsAvailabilitySubmitted(true);
      setShowAvailabilityForm(false);
      toast.success('Weekly availability submitted successfully!');
      
      // Recalculate hours
      calculateWeeklyHours(response.data.availability);
    } catch (error) {
      console.error('Error submitting availability:', error);
      toast.error(error.response?.data?.message || 'Failed to submit availability');
    }
  };

  // Add new time slot
  const handleAddTimeSlot = () => {
    if (!newTimeSlot.startTime || !newTimeSlot.endTime) {
      toast.error('Please enter both start and end times');
      return;
    }
    
    const start = moment(newTimeSlot.startTime, 'HH:mm');
    const end = moment(newTimeSlot.endTime, 'HH:mm');
    
    if (end.isSameOrBefore(start)) {
      toast.error('End time must be after start time');
      return;
    }
    
    // Check for overlapping slots
    const daySlots = availability[newTimeSlot.day];
    const newSlot = { startTime: newTimeSlot.startTime, endTime: newTimeSlot.endTime };
    
    for (const slot of daySlots) {
      const existingStart = moment(slot.startTime, 'HH:mm');
      const existingEnd = moment(slot.endTime, 'HH:mm');
      
      if (
        (start.isSameOrAfter(existingStart) && start.isBefore(existingEnd)) ||
        (end.isAfter(existingStart) && end.isSameOrBefore(existingEnd)) ||
        (start.isBefore(existingStart) && end.isAfter(existingEnd))
      ) {
        toast.error('Time slot overlaps with existing slot');
        return;
      }
    }
    
    // Add new slot
    setAvailability(prev => ({
      ...prev,
      [newTimeSlot.day]: [...prev[newTimeSlot.day], newSlot]
    }));
    
    // Reset form
    setNewTimeSlot({ day: newTimeSlot.day, startTime: '', endTime: '' });
    toast.success('Time slot added');
    
    // Recalculate hours
    calculateWeeklyHours({
      ...availability,
      [newTimeSlot.day]: [...availability[newTimeSlot.day], newSlot]
    });
  };

  // Remove time slot
  const handleRemoveTimeSlot = (day, index) => {
    const updatedSlots = [...availability[day]];
    updatedSlots.splice(index, 1);
    
    setAvailability(prev => ({
      ...prev,
      [day]: updatedSlots
    }));
    
    // Recalculate hours
    calculateWeeklyHours({
      ...availability,
      [day]: updatedSlots
    });
  };

  // Mark notification as read
  const handleNotificationRead = async (id) => {
    try {
      await axios.put(`https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadNotifications(prev => prev - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Send feedback
 const handleSendFeedback = async () => {
  if (!feedback.trim()) {
    toast.error('Please enter your feedback before submitting');
    return;
  }
  
  try {
    setLoading(true);
    await axios.post(
      `https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/feedback`,
      { feedback }
    );
    
    setFeedback('');
    setShowFeedbackModal(false);
    toast.success('Feedback submitted successfully!');
  } catch (error) {
    console.error('Error submitting feedback:', error);
    toast.error(
      error.response?.data?.message || 
      'Failed to submit feedback. Please try again later.'
    );
  } finally {
    setLoading(false);
  }
};
const ProductivityDisplay = () => {
  const [productivityData, setProductivityData] = useState({
    score: 0,
    message: 'Loading...',
    tips: [],
    meta: {}
  });

  useEffect(() => {
    const fetchProductivity = async () => {
      try {
        const response = await axios.get(
          `https://hrm-system-vm5e.onrender.com/api/developer/${developer._id}/productivity`
        );
        
        if (response.data.success) {
          setProductivityData({
            score: response.data.score,
            message: response.data.message,
            tips: response.data.tips,
            meta: response.data.meta
          });
        } else {
          setProductivityData({
            score: 0,
            message: 'Error loading data',
            tips: ['Could not load productivity data']
          });
        }
      } catch (error) {
        console.error('Error fetching productivity:', error);
        setProductivityData({
          score: 0,
          message: 'Connection error',
          tips: ['Failed to connect to server']
        });
      }
    };

    fetchProductivity();
  }, [developer._id]);

  return (
    <div className="productivity-container">
      <div className="productivity-score">
        <h3>Productivity Score</h3>
        <div className={`score-display ${productivityData.score === 0 ? 'zero' : ''}`}>
          {productivityData.score}%
        </div>
        <p className="productivity-message">{productivityData.message}</p>
      </div>

      <div className="planned-vs-actual">
        <h3>Planned vs Actual Hours</h3>
        <div className="hours-comparison">
          <div>
            <span>Planned:</span>
            <span>{Math.round(productivityData.meta.totalPlannedMinutes / 60)} hours</span>
          </div>
          <div>
            <span>Actual:</span>
            <span>{Math.round(productivityData.meta.totalActualMinutes / 60)} hours</span>
          </div>
          <div>
            <span>Variance:</span>
            <span className={
              productivityData.meta.totalActualMinutes >= productivityData.meta.totalPlannedMinutes ? 
              'positive' : 'negative'
            }>
              {Math.round(
                (productivityData.meta.totalActualMinutes - productivityData.meta.totalPlannedMinutes) / 60
              )} hours
            </span>
          </div>
        </div>
      </div>

      <div className="productivity-tips">
        <h3>Productivity Tips</h3>
        <ul>
          {productivityData.tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};


  // Logout from dashboard
  const handleLogout = () => {
    localStorage.removeItem('devAuthToken');
    localStorage.removeItem('developer');
    navigate('/developer-login');
  };

  // Format time duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (availabilityFormRef.current && !availabilityFormRef.current.contains(event.target)) {
        setShowAvailabilityForm(false);
      }
      if (timeSlotModalRef.current && !timeSlotModalRef.current.contains(event.target)) {
        setShowTimeSlotModal(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0e7490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="developer-dashboard">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="developer-avatar">
            {developer.name.charAt(0).toUpperCase()}
          </div>
          <h3>{developer.name}</h3>
          <p className="developer-role">{developer.role || 'Developer'}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${currentView === 'availability' ? 'active' : ''}`}
            onClick={() => setCurrentView('availability')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Availability
          </button>
          
          <button 
            className={`nav-item ${currentView === 'time-tracking' ? 'active' : ''}`}
            onClick={() => setCurrentView('time-tracking')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Time Tracking
          </button>
          
          <button 
            className={`nav-item ${currentView === 'notifications' ? 'active' : ''}`}
            onClick={() => setCurrentView('notifications')}
          >
            <div className="notification-badge" ref={notificationBellRef}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadNotifications > 0 && (
                <span className="badge-count">{unreadNotifications}</span>
              )}
            </div>
            Notifications
          </button>
          
          <button 
            className={`nav-item ${currentView === 'performance' ? 'active' : ''}`}
            onClick={() => setCurrentView('performance')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
            Performance
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h2>
            {currentView === 'dashboard' && 'Dashboard'}
            {currentView === 'availability' && 'Weekly Availability'}
            {currentView === 'time-tracking' && 'Time Tracking'}
            {currentView === 'notifications' && 'Notifications'}
            {currentView === 'performance' && 'Performance Analytics'}
          </h2>
          
          <div className="header-actions">
            <div className="current-week">
              <span>Week {currentWeek}, {currentYear}</span>
            </div>
            
            <button 
              className="feedback-btn"
              onClick={() => setShowFeedbackModal(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              Feedback
            </button>
          </div>
        </header>
        
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="dashboard-view">
            <div className="dashboard-grid">
              {/* Welcome Card */}
              <div className="dashboard-card welcome-card">
                <div className="card-header">
                  <h3>Welcome back, {developer.name}!</h3>
                  <p>Here's your weekly overview</p>
                </div>
                
                <div className="welcome-content">
                  <div className="welcome-metrics">
                    <div className="metric-item">
                      <span className="metric-value">{weeklyHours.toFixed(1)}</span>
                      <span className="metric-label">Planned Hours</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-value">{productivityScore}%</span>
                      <span className="metric-label">Productivity</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-value">{unreadNotifications}</span>
                      <span className="metric-label">New Notifications</span>
                    </div>
                  </div>
                  
                  {timeLeftForSubmission && !isAvailabilitySubmitted && (
                    <div className="availability-alert">
                      <div className="alert-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div className="alert-content">
                        <h4>Weekly Availability Due!</h4>
                        <p>Time left: {timeLeftForSubmission}</p>
                        <button 
                          className="submit-availability-btn"
                          onClick={() => setShowAvailabilityForm(true)}
                        >
                          Submit Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Work Status Card */}
              <div className="dashboard-card status-card">
                <div className="card-header">
                  <h3>Today's Status</h3>
                  <p>{moment().format('dddd, MMMM Do')}</p>
                </div>
                
                <div className="status-content">
                  <div className={`status-indicator ${todayLog.isWorking ? 'working' : 'not-working'}`}>
                    <div className="indicator-dot"></div>
                    <span>{todayLog.isWorking ? 'Currently Working' : 'Not Working'}</span>
                  </div>
                  
                  {todayLog.loginTime && (
                    <div className="status-time">
                      <span>Login: {moment(todayLog.loginTime).format('h:mm A')}</span>
                      {todayLog.logoutTime && (
                        <span>Logout: {moment(todayLog.logoutTime).format('h:mm A')}</span>
                      )}
                    </div>
                  )}
                  
                  <button 
                    className={`status-toggle-btn ${todayLog.isWorking ? 'logout' : 'login'}`}
                    onClick={handleWorkToggle}
                  >
                    {todayLog.isWorking ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                          <polyline points="10 17 15 12 10 7"></polyline>
                          <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                        Login
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Productivity Card */}
              <div className="dashboard-card productivity-card">
                <div className="card-header">
                  <h3>Productivity Score</h3>
                  <p>This week's performance</p>
                </div>
                
                <div className="productivity-content">
                  <div className="score-gauge">
                    <div 
                      className="gauge-fill" 
                      style={{ transform: `rotate(${180 * (productivityScore / 100)}deg)` }}
                    ></div>
                    <div className="gauge-center">
                      <span>{productivityScore}%</span>
                    </div>
                  </div>
                  
                  {productivityTips.length > 0 && (
                    <div className="productivity-tips">
                      <button 
                        className="tips-toggle"
                        onClick={() => setShowProductivityTips(!showProductivityTips)}
                      >
                        {showProductivityTips ? 'Hide Tips' : 'Show Tips'}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ transform: showProductivityTips ? 'rotate(180deg)' : 'rotate(0)' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      {showProductivityTips && (
                        <ul className="tips-list">
                          {productivityTips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Planned vs Actual Card */}
              <div className="dashboard-card planned-actual-card">
                <div className="card-header">
                  <h3>Planned vs Actual</h3>
                  <p>This week's comparison</p>
                </div>
                
                <div className="comparison-chart">
                  {plannedVsActual.map((day, index) => (
                    <div key={index} className="chart-day">
                      <div className="day-label">{day.day}</div>
                      <div className="bars-container">
                        <div 
                          className="bar planned" 
                          style={{ height: `${(day.plannedMinutes / 600) * 100}%` }}
                          title={`Planned: ${formatDuration(day.plannedMinutes)}`}
                        ></div>
                        <div 
                          className="bar actual" 
                          style={{ height: `${(day.actualMinutes / 600) * 100}%` }}
                          title={`Actual: ${formatDuration(day.actualMinutes)}`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color planned"></div>
                    <span>Planned</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color actual"></div>
                    <span>Actual</span>
                  </div>
                </div>
              </div>
              
              {/* Recent Activity Card */}
              <div className="dashboard-card activity-card">
                <div className="card-header">
                  <h3>Recent Activity</h3>
                  <p>Your latest work sessions</p>
                </div>
                
                <div className="activity-list">
                  {workLogs.slice(0, 5).map((log, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-date">
                        {moment(log.date).format('MMM D')}
                      </div>
                      <div className="activity-details">
                        <div className="activity-time">
                          {moment(log.loginTime).format('h:mm A')} -{' '}
                          {log.logoutTime ? moment(log.logoutTime).format('h:mm A') : 'Ongoing'}
                        </div>
                        <div className="activity-duration">
                          {log.durationMinutes > 0 ? formatDuration(log.durationMinutes) : 'In progress'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {workLogs.length === 0 && (
                    <div className="no-activity">
                      <p>No recent activity found</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Quick Actions Card */}
              <div className="dashboard-card actions-card">
                <div className="card-header">
                  <h3>Quick Actions</h3>
                </div>
                
                <div className="actions-grid">
                  <button 
                    className="action-item"
                    onClick={() => setShowAvailabilityForm(true)}
                  >
                    <div className="action-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <span>Update Availability</span>
                  </button>
                  
                  <button 
                    className="action-item"
                    onClick={() => setCurrentView('time-tracking')}
                  >
                    <div className="action-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <span>Time Tracking</span>
                  </button>
                  
                  <button 
                    className="action-item"
                    onClick={() => setCurrentView('notifications')}
                  >
                    <div className="action-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    </div>
                    <span>Notifications</span>
                  </button>
                  
                  <button 
                    className="action-item"
                    onClick={() => setShowFeedbackModal(true)}
                  >
                    <div className="action-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                    </div>
                    <span>Send Feedback</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Availability View */}
        {currentView === 'availability' && (
          <div className="availability-view">
            <div className="view-header">
              <h3>Weekly Availability</h3>
              <p>Plan your availability for the week</p>
              
              <div className="header-actions">
                <div className="total-hours">
                  <span>Total: </span>
                  <strong>{weeklyHours.toFixed(1)}</strong>
                  <span> / 36 hours</span>
                </div>
                
                <button 
                  className="submit-availability-btn"
                  onClick={() => setShowAvailabilityForm(true)}
                  disabled={isAvailabilitySubmitted}
                >
                  {isAvailabilitySubmitted ? 'Submitted' : 'Submit Availability'}
                </button>
              </div>
            </div>
            
            <div className="availability-calendar">
              <div className="calendar-nav">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <button
                    key={day}
                    className={`nav-day ${activeDay === day ? 'active' : ''}`}
                    onClick={() => setActiveDay(day)}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
              
              <div className="day-availability">
                <div className="day-header">
                  <h4>{activeDay}</h4>
                  <button 
                    className="add-slot-btn"
                    onClick={() => setShowTimeSlotModal(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Time Slot
                  </button>
                </div>
                
                {availability[activeDay].length > 0 ? (
                  <div className="time-slots">
                    {availability[activeDay].map((slot, index) => (
                      <div key={index} className="time-slot">
                        <div className="slot-time">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="slot-duration">
                          {moment.duration(moment(slot.endTime, 'HH:mm').diff(moment(slot.startTime, 'HH:mm'))).asHours().toFixed(1)}h
                        </div>
                        <button 
                          className="slot-remove"
                          onClick={() => handleRemoveTimeSlot(activeDay, index)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-slots">
                    <p>No time slots added for {activeDay}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="availability-requirements">
              <div className="requirement-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Minimum 36 hours per week</span>
              </div>
              <div className="requirement-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Submit before Monday 9 AM</span>
              </div>
              <div className="requirement-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>At least 4 days with availability</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Time Tracking View */}
        {currentView === 'time-tracking' && (
          <div className="time-tracking-view">
            <div className="view-header">
              <h3>Time Tracking</h3>
              <p>Your work sessions and time logs</p>
            </div>
            
            <div className="time-tracking-content">
              <div className="current-session">
                <div className="session-status">
                  <div className={`status-indicator ${todayLog.isWorking ? 'working' : 'not-working'}`}>
                    <div className="indicator-dot"></div>
                    <span>{todayLog.isWorking ? 'Currently Working' : 'Not Working'}</span>
                  </div>
                  
                  <button 
                    className={`toggle-btn ${todayLog.isWorking ? 'logout' : 'login'}`}
                    onClick={handleWorkToggle}
                  >
                    {todayLog.isWorking ? 'Logout' : 'Login'}
                  </button>
                </div>
                
                {todayLog.loginTime && (
                  <div className="session-details">
                    <div className="detail-item">
                      <span className="detail-label">Today's Login:</span>
                      <span className="detail-value">
                        {moment(todayLog.loginTime).format('h:mm A')}
                      </span>
                    </div>
                    
                    {todayLog.logoutTime && (
                      <div className="detail-item">
                        <span className="detail-label">Today's Logout:</span>
                        <span className="detail-value">
                          {moment(todayLog.logoutTime).format('h:mm A')}
                        </span>
                      </div>
                    )}
                    
                    {todayLog.durationMinutes > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {formatDuration(todayLog.durationMinutes)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="time-logs">
                <h4>Recent Work Sessions</h4>
                
                <div className="logs-table">
                  <div className="table-header">
                    <div className="header-cell">Date</div>
                    <div className="header-cell">Login Time</div>
                    <div className="header-cell">Logout Time</div>
                    <div className="header-cell">Duration</div>
                    <div className="header-cell">Status</div>
                  </div>
                  
                  <div className="table-body">
                    {workLogs.length > 0 ? (
                      workLogs.map((log, index) => (
                        <div key={index} className="table-row">
                          <div className="table-cell">
                            {moment(log.date).format('MMM D, YYYY')}
                          </div>
                          <div className="table-cell">
                            {moment(log.loginTime).format('h:mm A')}
                          </div>
                          <div className="table-cell">
                            {log.logoutTime ? moment(log.logoutTime).format('h:mm A') : '--'}
                          </div>
                          <div className="table-cell">
                            {log.durationMinutes > 0 ? formatDuration(log.durationMinutes) : '--'}
                          </div>
                          <div className="table-cell">
                            <span className={`status-badge ${log.durationMinutes > 0 ? 'completed' : 'incomplete'}`}>
                              {log.durationMinutes > 0 ? 'Completed' : 'Incomplete'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-logs">
                        <p>No work sessions recorded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Notifications View */}
        {currentView === 'notifications' && (
          <div className="notifications-view">
            <div className="view-header">
              <h3>Notifications</h3>
              <p>Your alerts and messages</p>
              
              <button 
                className="mark-all-read"
                onClick={() => {
                  setNotifications(prev => 
                    prev.map(n => ({ ...n, isRead: true }))
                  );
                  setUnreadNotifications(0);
                }}
                disabled={unreadNotifications === 0}
              >
                Mark All as Read
              </button>
            </div>
            
            <div className="notifications-list">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div 
                    key={index} 
                    className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationRead(notification._id)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'reminder' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      ) : notification.type === 'alert' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      )}
                    </div>
                    <div className="notification-content">
                      <h4 className="notification-title">{notification.title}</h4>
                      <p className="notification-message">{notification.message}</p>
                      <div className="notification-meta">
                        <span className="notification-time">
                          {moment(notification.createdAt).fromNow()}
                        </span>
                        {!notification.isRead && (
                          <span className="notification-badge">New</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-notifications">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <p>No notifications yet</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Performance View */}
        {currentView === 'performance' && (
          <div className="performance-view">
            <div className="view-header">
              <h3>Performance Analytics</h3>
              <p>Your productivity and work patterns</p>
            </div>
            
            <div className="performance-grid">
              <div className="performance-card">
                <div className="card-header">
                  <h4>Productivity Score</h4>
                  <p>Your efficiency this week</p>
                </div>
                <div className="score-display">
                  <div className="score-circle">
                    <span>{productivityScore}%</span>
                  </div>
                  <div className="score-description">
                    {productivityScore >= 80 ? (
                      <p>Excellent! You're performing above expectations.</p>
                    ) : productivityScore >= 60 ? (
                      <p>Good job! You're meeting expectations.</p>
                    ) : (
                      <p>There's room for improvement. Check the tips below.</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="performance-card">
                <div className="card-header">
                  <h4>Planned vs Actual Hours</h4>
                  <p>This week's comparison</p>
                </div>
                <div className="hours-comparison">
                  <div className="comparison-item">
                    <span className="comparison-label">Planned:</span>
                    <span className="comparison-value">
                      {plannedVsActual.reduce((sum, day) => sum + day.plannedMinutes, 0) / 60} hours
                    </span>
                  </div>
                  <div className="comparison-item">
                    <span className="comparison-label">Actual:</span>
                    <span className="comparison-value">
                      {plannedVsActual.reduce((sum, day) => sum + day.actualMinutes, 0) / 60} hours
                    </span>
                  </div>
                  <div className="comparison-item">
                    <span className="comparison-label">Variance:</span>
                    <span className={`comparison-value ${
                      plannedVsActual.reduce((sum, day) => sum + (day.actualMinutes - day.plannedMinutes), 0) >= 0 ? 
                      'positive' : 'negative'
                    }`}>
                      {(
                        (plannedVsActual.reduce((sum, day) => sum + day.actualMinutes, 0) - 
                        plannedVsActual.reduce((sum, day) => sum + day.plannedMinutes, 0)
                      ) / 60)} hours
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="performance-card">
                <div className="card-header">
                  <h4>Weekly Trend</h4>
                  <p>Your daily productivity</p>
                </div>
                <div className="trend-chart">
                  {plannedVsActual.map((day, index) => (
                    <div key={index} className="trend-day">
                      <div className="day-label">{day.day.substring(0, 3)}</div>
                      <div className="day-bar">
                        <div 
                          className="bar-fill" 
                          style={{ height: `${(day.productivity / 100) * 60}px` }}
                        ></div>
                      </div>
                      <div className="day-score">{day.productivity}%</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="performance-card tips-card">
                <div className="card-header">
                  <h4>Productivity Tips</h4>
                  <p>Ways to improve your performance</p>
                </div>
                <div className="tips-list">
                  {productivityTips.length > 0 ? (
                    <ul>
                      {productivityTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No specific tips available. Keep up the good work!</p>
                  )}
                </div>
              </div>
              
              <div className="performance-card">
                <div className="card-header">
                  <h4>Work Patterns</h4>
                  <p>Your typical work hours</p>
                </div>
                <div className="patterns-chart">
                  {/* This would be a more complex chart in a real implementation */}
                  <div className="pattern-grid">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <div key={i} className="pattern-day">
                        <div className="day-label">{day}</div>
                        <div className="day-slots">
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const hourStr = hour.toString().padStart(2, '0') + ':00';
                            const hasWork = workLogs.some(log => 
                              moment(log.date).format('ddd') === day && 
                              log.loginTime && 
                              moment(log.loginTime).hour() <= hour && 
                              (log.logoutTime ? moment(log.logoutTime).hour() > hour : true)
                            );
                            return (
                              <div 
                                key={hour} 
                                className={`hour-slot ${hasWork ? 'active' : ''}`}
                                title={`${day} ${hourStr}`}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pattern-legend">
                    <div className="legend-item">
                      <div className="legend-color active"></div>
                      <span>Typical work hour</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="performance-card">
                <div className="card-header">
                  <h4>Focus Areas</h4>
                  <p>Where to concentrate your efforts</p>
                </div>
                <div className="focus-areas">
                  {productivityScore >= 80 ? (
                    <p>You're doing great! Consider mentoring others or taking on stretch goals.</p>
                  ) : productivityScore >= 60 ? (
                    <ul>
                      <li>Reduce context switching between tasks</li>
                      <li>Schedule focus blocks in your calendar</li>
                      <li>Take regular breaks to maintain energy</li>
                    </ul>
                  ) : (
                    <ul>
                      <li>Minimize distractions during work hours</li>
                      <li>Align your work sessions with your most productive times</li>
                      <li>Break large tasks into smaller, manageable chunks</li>
                      <li>Communicate blockers to your manager early</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Availability Form Modal */}
      {showAvailabilityForm && (
        <div className="modal-overlay">
          <div className="modal-content" ref={availabilityFormRef}>
            <div className="modal-header">
              <h3>Submit Weekly Availability</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAvailabilityForm(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="availability-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Hours:</span>
                  <span className="summary-value">{weeklyHours.toFixed(1)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Status:</span>
                  <span className={`summary-value ${
                    weeklyHours >= 36 ? 'valid' : 'invalid'
                  }`}>
                    {weeklyHours >= 36 ? 'Valid' : 'Minimum 36 hours required'}
                  </span>
                </div>
              </div>
              
              <div className="availability-days">
                {Object.entries(availability).map(([day, slots]) => (
                  <div key={day} className="availability-day">
                    <h4>{day}</h4>
                    {slots.length > 0 ? (
                      <div className="day-slots">
                        {slots.map((slot, index) => (
                          <div key={index} className="day-slot">
                            <span>
                              {slot.startTime} - {slot.endTime} (
                              {moment.duration(
                                moment(slot.endTime, 'HH:mm').diff(moment(slot.startTime, 'HH:mm'))
                              ).asHours().toFixed(1)}h)
                            </span>
                            <button
                              className="remove-slot"
                              onClick={() => handleRemoveTimeSlot(day, index)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-slots">No time slots added</p>
                    )}
                    <button
                      className="add-slot-btn"
                      onClick={() => {
                        setNewTimeSlot({ day, startTime: '', endTime: '' });
                        setShowTimeSlotModal(true);
                      }}
                    >
                      Add Time Slot
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowAvailabilityForm(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleAvailabilitySubmit}
                disabled={weeklyHours < 36}
              >
                Submit Availability
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Time Slot Modal */}
      {showTimeSlotModal && (
        <div className="modal-overlay">
          <div className="modal-content small" ref={timeSlotModalRef}>
            <div className="modal-header">
              <h3>Add Time Slot</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTimeSlotModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Day</label>
                <select
                  value={newTimeSlot.day}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, day: e.target.value })}
                >
                  {Object.keys(availability).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={newTimeSlot.startTime}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, startTime: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={newTimeSlot.endTime}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, endTime: e.target.value })}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowTimeSlotModal(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleAddTimeSlot}
                disabled={!newTimeSlot.startTime || !newTimeSlot.endTime}
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Send Feedback</h3>
              <button 
                className="modal-close"
                onClick={() => setShowFeedbackModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or issues..."
                  rows="5"
                ></textarea>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowFeedbackModal(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleSendFeedback}
                disabled={!feedback.trim()}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer 
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default DeveloperDashboard;
