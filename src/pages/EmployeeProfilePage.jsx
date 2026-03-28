// src/pages/EmployeeProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEmployeeById } from '../services/apiService'; // Ensure this function exists in your apiService.jsx
import '../styles/profilePage.css'; // We will create this CSS file

// This should be the base URL where your FastAPI backend is running.
const API_BASE_URL = 'http://localhost:8000';

const EmployeeProfilePage = () => {
    // useParams() hook gets the dynamic part of the URL, in this case, the employee's ID.
    // This corresponds to the route path: "/employees/:employeeId"
    const { employeeId } = useParams();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEmployeeDetails = async () => {
            if (!employeeId) return;

            try {
                setLoading(true);
                setError('');
                const data = await getEmployeeById(employeeId);
                setEmployee(data);
            } catch (err) {
                setError('Failed to fetch employee data. The employee may not exist or an error occurred.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeDetails();
    }, [employeeId]); // This effect re-runs whenever the employeeId in the URL changes.

    // --- Render conditional UI based on the state ---

    if (loading) {
        return <div className="profile-page-container"><div className="status-message">Loading employee profile...</div></div>;
    }

    if (error) {
        return <div className="profile-page-container"><div className="status-message error">{error}</div></div>;
    }

    if (!employee) {
        return <div className="profile-page-container"><div className="status-message">Employee not found.</div></div>;
    }

    // --- Prepare data for rendering ---

    // Construct the full, absolute URLs for the document images.
    // The backend serves these files statically from the 'uploads' directory.
    const passportUrl = employee.passport_path ? `${API_BASE_URL}/${employee.passport_path}` : null;
    const visaUrl = employee.visa_path ? `${API_BASE_URL}/${employee.visa_path}` : null;

    return (
        <div className="profile-page-container">
            <div className="profile-card">
                <h1>{employee.name}'s Profile</h1>
                
                <div className="profile-section">
                    <h2>Details</h2>
                    <div className="profile-details-grid">
                        <p><strong>Designation:</strong> {employee.designation || 'N/A'}</p>
                        <p><strong>Status:</strong> <span className={`status-${employee.status?.toLowerCase()}`}>{employee.status || 'N/A'}</span></p>
                        <p><strong>Basic Salary:</strong> ${employee.basic_salary?.toFixed(2) || '0.00'}</p>
                        <p><strong>Allowance:</strong> ${employee.allowance?.toFixed(2) || '0.00'}</p>
                        <p><strong>Standard Work Days:</strong> {employee.standard_work_days || 'N/A'}</p>
                        <p><strong>Visa Expiry Date:</strong> {employee.visa_expiry_date || 'Not Available'}</p>
                    </div>
                </div>

                <div className="profile-section">
                    <h2>Documents</h2>
                    <div className="document-viewer">
                        <div className="document">
                            <h3>Passport</h3>
                            {passportUrl ? (
                                <a href={passportUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={passportUrl} alt="Passport Document" title="Click to view full size"/>
                                </a>
                            ) : (
                                <p className="no-document">No passport uploaded.</p>
                            )}
                        </div>
                        <div className="document">
                            <h3>Visa</h3>
                            {visaUrl ? (
                                <a href={visaUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={visaUrl} alt="Visa Document" title="Click to view full size"/>
                                </a>
                            ) : (
                                <p className="no-document">No visa uploaded.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfilePage;