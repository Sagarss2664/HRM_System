import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

// Global Styles
const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  body {
    background: linear-gradient(135deg, #a5f3fc, #bfdbfe, #99f6e4);
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
    color: #1e293b;
    transition: background 0.4s ease;
    min-height: 100vh;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Styled Components
const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const DashboardHeader = styled.header`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #0e7490;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    background: linear-gradient(to right, #06b6d4, #0d9488);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const HeaderUser = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const UserName = styled.div`
  font-weight: 600;
  color: #0f172a;
`;

const UserRole = styled.div`
  font-size: 0.85rem;
  color: #475569;
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  color: #0e7490;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.3s ease;

  &:hover {
    color: #0d9488;
  }
`;

const WelcomeSection = styled.section`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 2rem;
  border-radius: 20px;
  margin-bottom: 2rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border: 2px solid #bae6fd;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1.2rem;
  }
`;

const WelcomeTitle = styled.h1`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: #0e7490;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }

  @media (max-width: 480px) {
    font-size: 1.3rem;
  }
`;

const WelcomeSubtitle = styled.p`
  color: #475569;
  margin-bottom: 1rem;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border: 2px solid #bae6fd;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #0e7490;
  margin: 0.5rem 0;
`;

const StatLabel = styled.div`
  color: #475569;
  font-size: 0.9rem;
`;

const ActionSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border: 2px solid #bae6fd;
`;

const FormTitle = styled.h2`
  font-size: 1.3rem;
  color: #0e7490;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #334155;
  font-weight: 500;
`;

const FormControl = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #67e8f9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s ease;

  &:focus {
    outline: none;
    border-color: #06b6d4;
  }
`;

const SelectControl = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #67e8f9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.3s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%230e7490' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;

  &:focus {
    outline: none;
    border-color: #06b6d4;
  }
`;

const Button = styled.button`
  background: linear-gradient(to right, #06b6d4, #0d9488);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(to right, #0891b2, #0f766e);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &.btn-block {
    display: block;
    width: 100%;
  }

  &.btn-danger {
    background: #dc2626;
    
    &:hover {
      background: #b91c1c;
    }
  }
`;

const TeamMembersSelect = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.5rem;
`;

const TeamMemberOption = styled.label`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  cursor: pointer;

  &:hover {
    background-color: #f0f9ff;
  }

  input {
    margin-right: 0.75rem;
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 0.9rem;
  margin-top: 0.25rem;
`;

const SuccessMessage = styled.div`
  color: #16a34a;
  font-size: 0.9rem;
  margin-top: 0.25rem;
`;

const EmployeeListContainer = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const EmployeeItem = styled.div`
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(5px);
  }

  .employee-meta {
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 0.25rem;
  }

  .employee-email {
    font-size: 0.9rem;
    color: #475569;
  }
`;

const DashboardFooter = styled.footer`
  text-align: center;
  padding: 1.5rem;
  color: #64748b;
  font-size: 0.9rem;
`;

const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;

  &.success {
    background: #16a34a;
  }

  &.error {
    background: #dc2626;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
`;

const HRDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: 'HR Manager',
    role: 'HR Manager'
  });
  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    totalTeamLeads: 0,
    totalDevelopers: 0,
    totalTeams: 0
  });
  const [employees, setEmployees] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    mobile: '',
    role: '',
    password: '',
    teamName: '',
    teamId: ''
  });
  const [editFormData, setEditFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    mobile: '',
    role: '',
    password: '',
    teamName: '',
    teamId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [editSuccessMessage, setEditSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // API configuration
  const API_BASE_URL = 'http://localhost:5001/api';

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Load user data from localStorage
        const hrData = JSON.parse(localStorage.getItem('hrData'));
        if (hrData) {
          setUserData(hrData);
        }

        // Load initial data
        await Promise.all([
          loadStatistics(),
          loadEmployeeList(),
          loadTeams()
        ]);

      } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize dashboard', 'error');
      }
    };

    initializeDashboard();
  }, []);

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      showToast('Failed to load statistics', 'error');
    }
  };

  // Load employee list
  const loadEmployeeList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
      showToast('Failed to load employees', 'error');
    }
  };

  // Load available members
  const loadAvailableMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/available-members`);
      setAvailableMembers(response.data);
    } catch (error) {
      console.error('Failed to load available members:', error);
      showToast('Failed to load available members', 'error');
    }
  };

  // Load teams
  const loadTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to load teams:', error);
      showToast('Failed to load teams', 'error');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Show/hide role-specific fields
    if (name === 'role') {
      if (value === 'Team Lead') {
        loadAvailableMembers();
      }
    }
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });

    // Clear error when typing
    if (editErrors[name]) {
      setEditErrors({
        ...editErrors,
        [name]: ''
      });
    }

    // Show/hide role-specific fields
    if (name === 'role') {
      if (value === 'Team Lead') {
        loadAvailableMembers();
      }
    }
  };

  // Handle employee selection for editing
  const handleEmployeeSelect = async (e) => {
  const employeeId = e.target.value;
  if (!employeeId) {
    setSelectedEmployee(null);
    setEditFormData({
      employeeId: '',
      name: '',
      email: '',
      mobile: '',
      role: '',
      password: '',
      teamName: '',
      teamId: ''
    });
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/employees/${employeeId}`);
    const employee = response.data;
    
    setSelectedEmployee(employee);
    setEditFormData({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      role: employee.role,
      password: '',
      teamName: employee.teamName || '',
      teamId: employee.teamId || ''
    });
  } catch (error) {
    console.error('Error loading employee details:', error);
    showToast('Failed to load employee details', 'error');
    // Reset the form if there's an error
    setSelectedEmployee(null);
    setEditFormData({
      employeeId: '',
      name: '',
      email: '',
      mobile: '',
      role: '',
      password: '',
      teamName: '',
      teamId: ''
    });
  }
};
  // Handle member selection
  const handleMemberSelect = (e) => {
    const memberId = e.target.value;
    const isChecked = e.target.checked;

    if (isChecked) {
      setSelectedMembers([...selectedMembers, memberId]);
    } else {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    }
  };

  // Validate employee ID
  const validateEmployeeId = async (employeeId) => {
    if (!employeeId) return false;

    try {
      const response = await axios.post(`${API_BASE_URL}/check-employee-id`, { employeeId });
      if (response.data.exists) {
        setErrors({
          ...errors,
          employeeId: 'Employee ID already exists'
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('ID validation error:', error);
      showToast('Failed to validate Employee ID', 'error');
      return false;
    }
  };

  // Handle add employee form submission
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    // Validate employee ID
    const isIdValid = await validateEmployeeId(formData.employeeId);
    if (!isIdValid) {
      setLoading(false);
      return;
    }

    try {
      // Prepare data
      const data = {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        role: formData.role,
        password: formData.password,
        teamName: formData.role === 'Team Lead' ? formData.teamName : null,
        teamId: formData.role === 'Developer' ? formData.teamId : null,
        memberIds: formData.role === 'Team Lead' ? selectedMembers : null
      };

      // Submit data
      const response = await axios.post(`${API_BASE_URL}/add-employee`, data);

      if (response.data.success) {
        showToast('Employee added successfully!', 'success');
        
        // Reset form
        setFormData({
          employeeId: '',
          name: '',
          email: '',
          mobile: '',
          role: '',
          password: '',
          teamName: '',
          teamId: ''
        });
        setSelectedMembers([]);
        
        // Reload data
        await Promise.all([
          loadStatistics(),
          loadEmployeeList(),
          loadTeams()
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Add employee error:', error);
      setErrors({
        ...errors,
        employeeId: error.message
      });
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle update employee form submission
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditSuccessMessage('');

    try {
      // Prepare data
      const data = {
        name: editFormData.name,
        email: editFormData.email,
        mobile: editFormData.mobile,
        role: editFormData.role,
        password: editFormData.password || undefined,
        teamName: editFormData.role === 'Team Lead' ? editFormData.teamName : undefined,
        teamId: editFormData.role === 'Developer' ? editFormData.teamId : undefined
      };

      // Submit data
      const response = await axios.put(
        `${API_BASE_URL}/employees/${editFormData.employeeId}`,
        data
      );

      if (response.data.success) {
        showToast('Employee updated successfully!', 'success');
        
        // Reload data
        await Promise.all([
          loadStatistics(),
          loadEmployeeList(),
          loadTeams()
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Update employee error:', error);
      setEditErrors({
        ...editErrors,
        general: error.message
      });
      showToast(error.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    if (!editFormData.employeeId || !window.confirm('Are you sure you want to permanently delete this employee?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/employees/${editFormData.employeeId}`
      );

      if (response.data.success) {
        showToast('Employee deleted successfully!', 'success');
        
        // Reset form
        setEditFormData({
          employeeId: '',
          name: '',
          email: '',
          mobile: '',
          role: '',
          password: '',
          teamName: '',
          teamId: ''
        });
        
        // Reload data
        await Promise.all([
          loadStatistics(),
          loadEmployeeList(),
          loadTeams()
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error('Delete employee error:', error);
      setEditErrors({
        ...editErrors,
        general: error.message
      });
      showToast(error.message, 'error');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Show toast message
  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <GlobalStyle />
      <DashboardHeader>
        <HeaderTitle>
          <span>AI Tech HRM</span> | HR Dashboard
        </HeaderTitle>
        <HeaderUser>
          <div>
            <UserName>{userData.name}</UserName>
            <UserRole>HR Manager</UserRole>
          </div>
          <LogoutButton onClick={handleLogout}>
            <span>Logout</span> →
          </LogoutButton>
        </HeaderUser>
      </DashboardHeader>

      <DashboardContainer>
        <WelcomeSection>
          <WelcomeTitle>Welcome, <span>{userData.name}</span></WelcomeTitle>
          <WelcomeSubtitle>Manage your team's availability, track performance, and ensure smooth operations.</WelcomeSubtitle>
        </WelcomeSection>

        {/* Statistics Section */}
        <StatsContainer>
          <StatCard>
            <StatValue>{statistics.totalEmployees}</StatValue>
            <StatLabel>Total Employees</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{statistics.totalTeamLeads}</StatValue>
            <StatLabel>Team Leads</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{statistics.totalDevelopers}</StatValue>
            <StatLabel>Developers</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{statistics.totalTeams}</StatValue>
            <StatLabel>Teams</StatLabel>
          </StatCard>
        </StatsContainer>

        {/* Action Sections */}
        <ActionSection>
          {/* Add Employee Form */}
          <FormCard>
            <FormTitle>➕ Add New Employee</FormTitle>
            <form onSubmit={handleAddEmployee}>
              <FormGroup>
                <FormLabel htmlFor="employeeId">Employee ID</FormLabel>
                <FormControl
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  required
                  onBlur={() => validateEmployeeId(formData.employeeId)}
                />
                {errors.employeeId && <ErrorMessage>{errors.employeeId}</ErrorMessage>}
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="name">Full Name</FormLabel>
                <FormControl
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormControl
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="mobile">Mobile</FormLabel>
                <FormControl
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="role">Role</FormLabel>
                <SelectControl
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Developer">Developer</option>
                </SelectControl>
              </FormGroup>
              <FormGroup>
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              {/* Team Lead Specific Fields */}
              {formData.role === 'Team Lead' && (
                <>
                  <FormGroup>
                    <FormLabel htmlFor="teamName">Team Name</FormLabel>
                    <FormControl
                      type="text"
                      id="teamName"
                      name="teamName"
                      value={formData.teamName}
                      onChange={handleInputChange}
                    />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Assign Team Members</FormLabel>
                    <TeamMembersSelect>
                      {availableMembers.length > 0 ? (
                        availableMembers.map(member => (
                          <TeamMemberOption key={member.employeeId}>
                            <input
                              type="checkbox"
                              name="teamMembers"
                              value={member.employeeId}
                              onChange={handleMemberSelect}
                              checked={selectedMembers.includes(member.employeeId)}
                            />
                            {member.name} ({member.employeeId}) - {member.role}
                          </TeamMemberOption>
                        ))
                      ) : (
                        <p>No available members</p>
                      )}
                    </TeamMembersSelect>
                  </FormGroup>
                </>
              )}

              {/* Developer Specific Fields */}
              {formData.role === 'Developer' && (
                <FormGroup>
                  <FormLabel htmlFor="teamId">Assign to Team</FormLabel>
                  <SelectControl
                    id="teamId"
                    name="teamId"
                    value={formData.teamId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>
                        {team.name} (Lead: {team.leadName})
                      </option>
                    ))}
                  </SelectControl>
                </FormGroup>
              )}

              <Button type="submit" className="btn-block" disabled={loading}>
                {loading ? 'Processing...' : 'Add Employee'}
              </Button>
              {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
            </form>
          </FormCard>

          {/* Employee List */}
          <FormCard>
            <FormTitle>👥 Employee List</FormTitle>
            <FormGroup>
              <FormControl
                type="text"
                id="searchEmployee"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </FormGroup>
            <EmployeeListContainer>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(employee => (
                  <EmployeeItem key={employee.employeeId}>
                    <div>
                      <strong>{employee.name}</strong>
                      <div className="employee-meta">
                        {employee.employeeId} | {employee.role}
                        {employee.teamName && ` | Team: ${employee.teamName}`}
                      </div>
                    </div>
                    <div className="employee-email">{employee.email}</div>
                  </EmployeeItem>
                ))
              ) : (
                <p>No employees found</p>
              )}
            </EmployeeListContainer>
          </FormCard>
        </ActionSection>

        {/* Edit Employee Form */}
        <FormCard>
          <FormTitle>✏️ Edit Employee</FormTitle>
          <form onSubmit={handleUpdateEmployee}>
            <FormGroup>
              <FormLabel htmlFor="editEmployeeId">Employee</FormLabel>
              <SelectControl
                id="editEmployeeId"
                name="employeeId"
                value={editFormData.employeeId}
                onChange={handleEmployeeSelect}
                required
              >
                <option value="">Select Employee</option>
                {employees.map(employee => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.name} ({employee.employeeId})
                  </option>
                ))}
              </SelectControl>
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="editName">Full Name</FormLabel>
              <FormControl
                type="text"
                id="editName"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="editEmail">Email</FormLabel>
              <FormControl
                type="email"
                id="editEmail"
                name="email"
                value={editFormData.email}
                onChange={handleEditInputChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="editMobile">Mobile</FormLabel>
              <FormControl
                type="tel"
                id="editMobile"
                name="mobile"
                value={editFormData.mobile}
                onChange={handleEditInputChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="editRole">Role</FormLabel>
              <SelectControl
                id="editRole"
                name="role"
                value={editFormData.role}
                onChange={handleEditInputChange}
                required
              >
                <option value="">Select Role</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Developer">Developer</option>
                <option value="HR">HR</option>
              </SelectControl>
            </FormGroup>
            <FormGroup>
              <FormLabel htmlFor="editPassword">New Password (leave blank to keep current)</FormLabel>
              <FormControl
                type="password"
                id="editPassword"
                name="password"
                value={editFormData.password}
                onChange={handleEditInputChange}
              />
            </FormGroup>

            {/* Team Lead Specific Fields */}
            {editFormData.role === 'Team Lead' && (
              <FormGroup>
                <FormLabel htmlFor="editTeamName">Team Name</FormLabel>
                <FormControl
                  type="text"
                  id="editTeamName"
                  name="teamName"
                  value={editFormData.teamName}
                  onChange={handleEditInputChange}
                />
              </FormGroup>
            )}

            {/* Developer Specific Fields */}
            {editFormData.role === 'Developer' && (
              <FormGroup>
                <FormLabel htmlFor="editTeamId">Assign to Team</FormLabel>
                <SelectControl
                  id="editTeamId"
                  name="teamId"
                  value={editFormData.teamId}
                  onChange={handleEditInputChange}
                >
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team._id} value={team._id}>
                      {team.name} (Lead: {team.leadName})
                    </option>
                  ))}
                </SelectControl>
              </FormGroup>
            )}

            <FormGroup style={{ display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? 'Updating...' : 'Update Employee'}
              </Button>
              <Button 
                type="button" 
                className="btn-danger" 
                onClick={handleDeleteEmployee}
                disabled={!editFormData.employeeId || editLoading}
              >
                Delete Employee
              </Button>
            </FormGroup>
            {editSuccessMessage && <SuccessMessage>{editSuccessMessage}</SuccessMessage>}
            {editErrors.general && <ErrorMessage>{editErrors.general}</ErrorMessage>}
          </form>
        </FormCard>

        <DashboardFooter>
          <p>AI Technology Company © {new Date().getFullYear()} | Flexible 4-Day Work Week</p>
        </DashboardFooter>
      </DashboardContainer>

      {/* Toast Notification */}
      {toast && (
        <Toast className={toast.type}>
          {toast.message}
        </Toast>
      )}
    </>
  );
};

export default HRDashboard;