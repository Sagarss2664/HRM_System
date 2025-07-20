// import React, { useState } from "react";
// import axios from "axios";

// function TeamLeadLogin() {
//   const [employeeId, setEmployeeId] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       const response = await axios.post("https://hrm-system-vm5e.onrender.com/api/login/teamlead", {
//         employeeId,
//         password,
//       });
//       setMessage(`Login successful! Welcome ${response.data.employee.name}`);
//       // TODO: redirect to dashboard if needed
//     } catch (error) {
//       setMessage(
//         error.response?.data?.message || "Login failed. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-200 to-teal-200">
//       <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
//         <h2 className="text-2xl font-bold mb-4 text-center">Team Lead Login</h2>
//         <form onSubmit={handleLogin} className="space-y-4">
//           <input
//             type="text"
//             placeholder="Employee ID"
//             value={employeeId}
//             onChange={(e) => setEmployeeId(e.target.value)}
//             required
//             className="w-full border px-3 py-2 rounded"
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//             className="w-full border px-3 py-2 rounded"
//           />
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-teal-600 text-white py-2 rounded hover:opacity-90"
//           >
//             {loading ? "Logging in..." : "Login"}
//           </button>
//           {message && (
//             <p className="text-center mt-4 text-red-500">{message}</p>
//           )}
//         </form>
//       </div>
//     </div>
//   );
// }

// export default TeamLeadLogin;
import React, { useState } from "react";
import axios from "axios";
import "./CSS/HRLogin.css"; // Make sure to include your theme CSS

function TeamLeadLogin() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post("https://hrm-system-vm5e.onrender.com/api/login/teamlead", {
        employeeId,
        password,
      });
      setMessage(`Login successful! Welcome ${response.data.employee.name}`);
      // TODO: redirect to dashboard
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
          <span>Team Lead Login</span>
        </h2>
        <p className="login-subtitle">Please sign in to continue</p>
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
          {message && <p className="error-message" style={{ display: "block" }}>{message}</p>}
        </form>
        <div className="login-footer">Need help? Contact admin.</div>
      </div>
    </div>
  );
}

export default TeamLeadLogin;
