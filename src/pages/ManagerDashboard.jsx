// src/pages/ManagerDashboard.jsx

import React, { useState, useEffect } from 'react';
import ContentHeader from '../components/ContentHeader';
import { FaUserCircle, FaBriefcase, FaEllipsisV } from 'react-icons/fa';
import '../styles/dashboard.css'; 
import { getEmployees } from '../services/apiService';
// Assuming websocketService is imported or available globally
// import websocketService from '../services/websocketService';

const ManagerDashboardPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reconnectMessage, setReconnectMessage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getEmployees();
        // --- ADDED: Debugging log to inspect the API data ---
        console.log("Fetched employees for Manager Dashboard:", data);
        setEmployees(Array.isArray(data) ? data : []); // Ensure data is always an array
      } catch (e) {
        console.error("Failed to load employee data:", e); // --- MODIFIED: Better error logging ---
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // --- MODIFIED: Added error handling for websocket connection ---
    try {
        // websocketService.register(setEmployees, setReconnectMessage);
        // websocketService.connect();
    } catch (wsError) {
        console.error("WebSocket connection failed:", wsError);
        setReconnectMessage("Real-time updates are unavailable.");
    }

    return () => {
        // websocketService.unregister();
    };
  }, []);

  // --- MODIFIED: Made calculations safer ---
  const totalEmployees = employees.length;
  const uniqueDesignations = [...new Set(employees.map(e => e.designation).filter(Boolean))];

  const SkeletonCard = () => ( <div className="card skeleton"><div className="skeleton-icon"></div><div className="skeleton-text skeleton-text-medium"></div></div> );
  const SkeletonEmployee = () => ( <li className="employee-item skeleton"><div className="skeleton-avatar"></div><div className="employee-details"><div className="employee-info"><div className="skeleton-text skeleton-text-short"></div><div className="skeleton-text skeleton-text-long"></div></div></div><div className="skeleton-text skeleton-text-medium"></div></li> );
  
  // --- MODIFIED: Return skeleton loaders while loading ---
  if (loading) {
    return (
        <div className="dashboard-page-main">
            <ContentHeader />
            <div className="cards">
                <SkeletonCard /><SkeletonCard />
            </div>
            <div className="employees-section">
                <div className="employees-header"><h3 className="employees-title">Loading Team Members...</h3></div>
                <ul className="employee-list">{Array.from({ length: 5 }).map((_, index) => <SkeletonEmployee key={index} />)}</ul>
            </div>
        </div>
    );
  }
  
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-page-main">
      <ContentHeader />
      
      <div className="cards">
        {/* ... (cards content remains the same) ... */}
      </div>

      <div className="employees-section">
        <div className="employees-header">
          <h3 className="employees-title">Your Team Members</h3>
          {reconnectMessage && <div className="reconnect-message">{reconnectMessage}</div>}
        </div>
        <ul className="employee-list">
          {employees.map(employee => (
              <li key={employee.id} className="employee-item">
                <div className="employee-details">
                  {/* --- MODIFIED: Safer data access --- */}
                  <div className="employee-avatar-placeholder">{employee.name?.charAt(0).toUpperCase() ?? '?'}</div>
                  <div className="employee-info">
                    <span className="employee-name">{employee.name ?? 'No Name'}</span>
                    <span className="employee-designation">{employee.designation ?? 'No Designation'}</span>
                  </div>
                </div>
                <div className="employee-pay">
                  Status: {employee.status || 'Active'}
                </div>
                <span className="employee-options"><FaEllipsisV /></span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default ManagerDashboardPage;