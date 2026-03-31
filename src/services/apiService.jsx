import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = 'http://127.0.0.1:8000'; 

// --- CORE API HELPER ---
export const fetchWithAuth = async (endpoint, options = {}) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    
    if (!token && !endpoint.includes('/token')) {
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Authentication Error: No token found.');
    }

    const isFormData = options.body instanceof FormData;
    const headers = { 
        'Authorization': `Bearer ${token}`, 
        ...options.headers 
    };
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const config = { ...options, headers };
    const fullUrl = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(fullUrl, config);

        if (response.status === 401) {
            logout();
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 422) {
                console.error("VALIDATION ERROR (422):", errorData.detail);
                throw new Error(`Validation Error: ${JSON.stringify(errorData.detail)}`);
            }

            if (response.status === 404) {
                console.error(`[NOT FOUND 404] ${endpoint}`);
                throw new Error('Endpoint not found (404).');
            }

            if (response.status === 500) {
                console.error(`[SERVER ERROR 500] ${endpoint}`);
                throw new Error('Internal Server Error (500).');
            }

            const errorMessage = errorData.detail || errorData.message || `Error ${response.status}`;
            throw new Error(errorMessage);
        }

        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error(`[API Network Error] ${endpoint}:`, error);
        throw error;
    }
};

// --- 1. AUTHENTICATION ---
export const login = async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await fetch(`${API_BASE_URL}/token`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Login failed.');
    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('accessToken', data.access_token); 
    }
    return data;
};

export const logout = () => {
    localStorage.clear();
    window.location.href = '/login'; 
};

// --- 2. HR & EMPLOYEES ---
export const getEmployees = () => fetchWithAuth('/employees/'); 
export const getEmployeeById = (id) => fetchWithAuth(`/employees/${id}/`);
export const addEmployee = (formData) => fetchWithAuth('/employees/', { method: 'POST', body: formData });
export const updateEmployee = (id, data) => fetchWithAuth(`/employees/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEmployee = (id) => fetchWithAuth(`/employees/${id}/`, { method: 'DELETE' });

export const getDesignations = () => fetchWithAuth('/designations/');
export const addDesignation = (title) => fetchWithAuth('/designations/', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteDesignation = (id) => fetchWithAuth(`/designations/${id}/`, { method: 'DELETE' });

export const getSites = () => fetchWithAuth('/sites/');
export const addSite = (siteData) => fetchWithAuth('/sites/', { method: 'POST', body: JSON.stringify(siteData) });
export const deleteSite = (siteId) => fetchWithAuth(`/sites/${siteId}/`, { method: 'DELETE' });

// --- 3. ATTENDANCE & DUTY LIST ---
export const getAttendanceByDate = (date) => fetchWithAuth(`/attendance/by-date/${date}`);
// FIXED: Trailing slash for 404 fix
export const getAttendanceByMonth = (year, month) => fetchWithAuth(`/attendance/by-month/${year}/${month}/`);
export const updateAttendance = (recordsBatch) => fetchWithAuth('/attendance/update/', { method: 'POST', body: JSON.stringify(recordsBatch) });

export const downloadAttendancePDF = async (date) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/attendance/export-pdf/${date}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Attendance_${date}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
};

export const getDutyAssignments = (date) => fetchWithAuth(`/duty_list/${date}`);
export const saveDutyAssignments = (payload) => fetchWithAuth('/duty_list/', { method: 'POST', body: JSON.stringify(payload) });
export const deleteDutyAssignment = (id) => fetchWithAuth(`/duty_list/${id}`, { method: 'DELETE' });

// --- 4. PAYSLIPS & FINANCE ---
export const getFinancialSummary = () => fetchWithAuth('/finance/summary');
export const calculatePayslips = (employeeIds) => fetchWithAuth('/payslips/calculate/', { method: 'POST', body: JSON.stringify({ employee_ids: employeeIds }) });
export const createPayslips = calculatePayslips; // Exporting both names for Dashboard compatibility

export const downloadPayslipPDF = async (employeeId, month = "2024-11") => {
    const token = localStorage.getItem('access_token');
    const fullUrl = `${API_BASE_URL}/payslips/download/${employeeId}?month=${month}`;
    const response = await fetch(fullUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Payslip_${employeeId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
};

// --- 5. VEHICLE MANAGEMENT ---
export const getVehicles = () => fetchWithAuth('/vehicles/');
export const addVehicle = (data) => fetchWithAuth('/vehicles/', { method: 'POST', body: JSON.stringify(data) });
export const getTrips = () => fetchWithAuth('/vehicles/trips');
export const startTrip = (data) => fetchWithAuth('/vehicles/trip/start', { method: 'POST', body: JSON.stringify(data) });
export const endTrip = (tripId, endMileage, endCondition) => fetchWithAuth(`/vehicles/trip/end/${tripId}?end_mileage=${endMileage}&end_condition=${endCondition}`, { method: 'POST' });
export const getMaintenanceLogs = () => fetchWithAuth('/vehicles/maintenance');
export const addMaintenanceLog = (data) => fetchWithAuth('/vehicles/maintenance', { method: 'POST', body: JSON.stringify(data) });
export const getFuelLogs = () => fetchWithAuth('/vehicles/fuel');
export const addFuelLog = (data) => fetchWithAuth('/vehicles/fuel', { method: 'POST', body: JSON.stringify(data) });
export const getExpenses = () => fetchWithAuth('/vehicles/expenses');
export const addExpense = (data) => fetchWithAuth('/vehicles/expense', { method: 'POST', body: JSON.stringify(data) });

// --- 6. PROJECTS & INVOICES ---
export const getContracts = () => fetchWithAuth('/contracts/');
export const addContract = (data) => fetchWithAuth('/contracts/', { method: 'POST', body: JSON.stringify(data) });
export const deleteContract = (id) => fetchWithAuth(`/contracts/${id}`, { method: 'DELETE' });
export const addProjectExpense = (uid, data) => fetchWithAuth(`/contracts/${uid}/expense`, { method: 'POST', body: JSON.stringify(data) });

export const getInvoices = () => fetchWithAuth('/invoices/');
export const createInvoice = (data) => fetchWithAuth('/invoices/', { method: 'POST', body: JSON.stringify(data) });
export const payInvoice = (uid) => fetchWithAuth(`/invoices/${uid}/pay`, { method: 'PATCH' });

export const downloadInvoicePDF = async (uid, invNo) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/invoices/${uid}/pdf`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Invoice_${invNo}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
};

// --- 7. ADMINS & INVENTORY ---
export const getAdmins = () => fetchWithAuth('/admins/');
export const getManagers = () => fetchWithAuth('/admins/managers');
export const createAdmin = (adminData) => fetchWithAuth('/admins/', { method: 'POST', body: JSON.stringify(adminData) });

// --- 8. MANAGER PROFILES ---
export const getManagerProfiles = () => fetchWithAuth('/managers/profiles');
export const getManagerProfileById = (id) => fetchWithAuth(`/managers/profiles/${id}`);
export const createManagerProfile = (data) => fetchWithAuth('/managers/profiles', { method: 'POST', body: JSON.stringify(data) });
export const updateManagerProfile = (id, data) => fetchWithAuth(`/managers/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteManagerProfile = (id) => fetchWithAuth(`/managers/profiles/${id}`, { method: 'DELETE' });
export const updateManagerCredentials = (id, data) => fetchWithAuth(`/managers/profiles/${id}/credentials`, { method: 'PUT', body: JSON.stringify(data) });
export const updateManagerSites = (id, data) => fetchWithAuth(`/managers/profiles/${id}/sites`, { method: 'PUT', body: JSON.stringify(data) });

// --- 9. MANAGER ATTENDANCE CONFIG & MONITORING ---
export const getManagerAttendanceConfig = (id) => fetchWithAuth(`/managers/attendance/config/${id}`);
export const updateManagerAttendanceConfig = (id, data) => fetchWithAuth(`/managers/attendance/config/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const getManagerAttendanceAll = (date) => fetchWithAuth(`/managers/attendance/all?date=${date}`);
export const overrideManagerAttendance = (data) => fetchWithAuth('/managers/attendance/override', { method: 'POST', body: JSON.stringify(data) });

// --- 10. MANAGER SELF-SERVICE ATTENDANCE ---
export const getMyAttendanceConfig = () => fetchWithAuth('/managers/attendance/my-config');
export const checkInSegment = (segment) => fetchWithAuth(`/managers/attendance/check-in/${segment}`, { method: 'POST' });
export const getMyTodayAttendance = () => fetchWithAuth('/managers/attendance/my-today');
export const getMyAttendanceHistory = (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return fetchWithAuth(`/managers/attendance/my-history${query ? `?${query}` : ''}`);
};

export const getInventory = () => fetchWithAuth('/inventory/');
export const addInventoryItem = (data) => fetchWithAuth('/inventory/', { method: 'POST', body: JSON.stringify(data) });
export const deleteInventoryItem = (id) => fetchWithAuth(`/inventory/${id}`, { method: 'DELETE' });

const apiService = { 
    fetchWithAuth, login, logout, getEmployees, getEmployeeById, addEmployee, updateEmployee, deleteEmployee,
    getDesignations, addDesignation, deleteDesignation, getSites, addSite, deleteSite,
    getAttendanceByDate, getAttendanceByMonth, updateAttendance, downloadAttendancePDF,
    getDutyAssignments, saveDutyAssignments, deleteDutyAssignment,
    getFinancialSummary, calculatePayslips, createPayslips, downloadPayslipPDF,
    getVehicles, addVehicle, getTrips, startTrip, endTrip, getMaintenanceLogs, addMaintenanceLog, getFuelLogs, addFuelLog, getExpenses, addExpense,
    getContracts, addContract, deleteContract, addProjectExpense,
    getInvoices, createInvoice, payInvoice, downloadInvoicePDF,
    getAdmins, createAdmin, getInventory, addInventoryItem, deleteInventoryItem,
    getManagers,
    getManagerProfiles, getManagerProfileById, createManagerProfile, updateManagerProfile, deleteManagerProfile,
    updateManagerCredentials, updateManagerSites,
    getManagerAttendanceConfig, updateManagerAttendanceConfig, getManagerAttendanceAll, overrideManagerAttendance,
    getMyAttendanceConfig, checkInSegment, getMyTodayAttendance, getMyAttendanceHistory,
};

export default apiService;