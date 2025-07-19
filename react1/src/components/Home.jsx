// import React from "react";
// import { Link } from "react-router-dom";


// function Home() {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-200 to-teal-200">
//       <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
//         <div className="text-5xl mb-4">🤖</div>
//         <h1 className="text-2xl font-bold text-gray-700">
//           Welcome to <span className="text-teal-600">Uotl AI Technologies LLP</span>
//         </h1>
//         <p className="text-gray-500 mt-2 mb-6">
//           Streamlined human resource management for our innovative team
//         </p>

//         <Link to="/hr-login">
//           <button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white w-full py-3 rounded-lg mb-4 font-semibold hover:opacity-90 transition">
//             HR Login
//           </button>
//         </Link>
//         <Link to="/teamlead-login">
//           <button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white w-full py-3 rounded-lg mb-4 font-semibold hover:opacity-90 transition">
//             Team Lead Login
//           </button>
//         </Link>
//         <Link to="/developer-login">
//           <button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white w-full py-3 rounded-lg font-semibold hover:opacity-90 transition">
//             Developer Login
//           </button>
//         </Link>
//         <p className="text-gray-400 text-sm mt-6">
//           AI Technology Company © 2023 | Flexible 4-Day Work Week
//         </p>
//       </div>
//     </div>
//   );
// }

// export default Home;
import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-icon">🤖</div>
        <h1 className="home-title">
          Welcome to <span>UotI AI Technologies LLP</span>
        </h1>
        <p className="home-subtitle">
          Streamlined human resource management for our innovative team
        </p>

        <div className="role-buttons">
          <Link to="/hr-login" className="role-button">HR Login</Link>
          <Link to="/teamlead-login" className="role-button">Team Lead Login</Link>
          <Link to="/developer-login" className="role-button">Developer Login</Link>
        </div>
      </div>

      <div className="home-footer">
        <p>AI Technology Company © 2023 | Flexible 4-Day Work Week</p>
      </div>
    </div>
  );
}

export default Home;
