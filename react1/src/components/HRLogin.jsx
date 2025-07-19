// import React, { useState } from "react";
// import axios from "axios";
// import "./CSS/HRLogin.css"; // Make sure to link the CSS file

// function HRLogin() {
//   const [employeeId, setEmployeeId] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       const response = await axios.post("http://localhost:5001/api/login/hr", {
//         employeeId,
//         password,
//       });
//       setMessage(`Login successful! Welcome ${response.data.employee.name}`);
//       // TODO: redirect to dashboard
//     } catch (error) {
//       console.log(error.response?.data);
//       setMessage(
//         error.response?.data?.message || "Login failed. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="login-container">
//       <div className="login-card">
//         <h2 className="login-title">
//           <span>HR Login</span>
//         </h2>
//         <p className="login-subtitle">Welcome back! Please log in.</p>
//         <form onSubmit={handleLogin} className="login-form">
//           <label>
//             Employee ID
//             <div className="input-icon">
//               <input
//                 type="text"
//                 placeholder="Enter your ID"
//                 value={employeeId}
//                 onChange={(e) => setEmployeeId(e.target.value)}
//                 required
//               />
//             </div>
//           </label>
//           <label>
//             Password
//             <div className="input-icon">
//               <input
//                 type="password"
//                 placeholder="Enter your password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//               />
//             </div>
//           </label>
//           <button type="submit" disabled={loading}>
//             {loading ? "Logging in..." : "Login"}
//           </button>
//           {message && <p className="error-message" style={{ display: "block" }}>{message}</p>}
//         </form>
//         <div className="login-footer">Powered by HR Portal</div>
//       </div>
//     </div>
//   );
// }

// export default HRLogin;
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CSS/HRLogin.css";

function HRLogin() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post("http://localhost:5001/api/login/hr", {
        employeeId,
        password,
      });

      const { name } = response.data.employee;

      // Save HR info to localStorage
      localStorage.setItem("hrName", name);

      // Redirect to dashboard
     navigate("/hr-dashboard");  // ✅ Correct


      
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">
          <span>HR Login</span>
        </h2>
        <p className="login-subtitle">Welcome back! Please log in.</p>
        <form onSubmit={handleLogin} className="login-form">
          <label>
            Employee ID
            <div className="input-icon">
              <input
                type="text"
                placeholder="Enter your ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
          </label>
          <label>
            Password
            <div className="input-icon">
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          {message && (
            <p className="error-message" style={{ display: "block" }}>
              {message}
            </p>
          )}
        </form>
        <div className="login-footer">Powered by HR Portal</div>
      </div>
    </div>
  );
}

export default HRLogin;
