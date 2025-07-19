import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HRLogin from "./components/HRLogin";
import TeamLeadLogin from "./components/TeamLeadLogin";
import DeveloperLogin from "./components/DeveloperLogin";
import HRDashboard from "./components/HRDashboard"; 
import Home from "./components/Home";
import DeveloperDashboard from "./components/DeveloperDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hr-login" element={<HRLogin />} />
        <Route path="/teamlead-login" element={<TeamLeadLogin />} />
        <Route path="/developer-login" element={<DeveloperLogin />} />
        <Route path="/hr-dashboard" element={<HRDashboard/>} />
        <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;
