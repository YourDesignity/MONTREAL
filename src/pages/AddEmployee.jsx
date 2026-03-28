// src/pages/AddEmployeePage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEmployee } from '../services/apiService';
import '../styles/AddEmployee.css'; 

// 1. Import SweetAlert2
import Swal from 'sweetalert2';

const AddEmployeePage = () => {
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        basic_salary: '',
        standard_work_days: ''
    });
    const [passportFile, setPassportFile] = useState(null);
    const [visaFile, setVisaFile] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e, setFile) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!passportFile || !visaFile) {
            // Error Popup
            Swal.fire({
                icon: 'error',
                title: 'Missing Files',
                text: 'Passport and Visa files are both required.',
                confirmButtonColor: '#d33',
            });
            return;
        }

        setIsLoading(true);

        const submissionData = new FormData();
        Object.keys(formData).forEach(key => {
            submissionData.append(key, formData[key]);
        });
        submissionData.append('passport_file', passportFile);
        submissionData.append('visa_file', visaFile);

        try {
            await addEmployee(submissionData);
            
            // 2. SUCCESS POPUP (The "Much Better" UI)
            await Swal.fire({
                title: 'Success!',
                text: 'Employee added successfully.',
                icon: 'success',
                confirmButtonText: 'Great!',
                confirmButtonColor: '#3085d6', // Matches a nice blue theme
                timer: 3000, // Auto close after 3 seconds
                timerProgressBar: true,
            });

            navigate('/dashboard'); 

        } catch (err) {
            // Error Popup
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: err.message || 'Failed to add employee.',
                confirmButtonColor: '#d33',
            });
            setError(err.message || 'Failed to add employee.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-page-container">
            <div className="form-card">
                <h2>Add New Employee</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>Designation / Job Role</label>
                        <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>Basic Salary</label>
                        <input type="number" step="0.01" name="basic_salary" value={formData.basic_salary} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>Standard Work Days</label>
                        <input type="number" name="standard_work_days" value={formData.standard_work_days} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>Passport Upload</label>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, setPassportFile)} required />
                    </div>
                    <div className="form-group">
                        <label>Visa Upload</label>
                        <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, setVisaFile)} required />
                    </div>
                    <button type="submit" className="form-submit-btn" disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Add Employee'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddEmployeePage;