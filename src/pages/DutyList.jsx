import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, Checkbox, Avatar, Typography, Button, Input, 
  Modal, Form, Select, DatePicker, message, Spin, Space, Tag, Table, Badge, Popconfirm, Divider
} from 'antd';
import { 
  SearchOutlined, EyeOutlined, DeleteOutlined, CheckCircleOutlined, UserOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs'; 
import '../styles/DutyList.css';

// --- Services ---
import { 
    getEmployees, getSites, saveDutyAssignments, 
    getDutyAssignments, getAdmins
} from '../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;

// Fallback for direct deletion
const deleteDutyManual = async (id) => {
    const token = localStorage.getItem('access_token');
    return fetch(`http://127.0.0.1:8000/duty_list/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

const DutyListPage = () => {
    const [form] = Form.useForm();
    
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [assignedIdsToday, setAssignedIdsToday] = useState([]); 
    
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewDate, setViewDate] = useState(dayjs()); 
    const [dutyListRecords, setDutyListRecords] = useState([]);
    const [loadingDuty, setLoadingDuty] = useState(false);

    // --- 1. Load Data ---
    useEffect(() => {
        fetchInitialData();
        refreshAssignedList();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [empData, siteData, adminData] = await Promise.all([
                getEmployees(), getSites(), getAdmins()
            ]);
            setEmployees(Array.isArray(empData) ? empData : []);
            setSites(Array.isArray(siteData) ? siteData : []);
            
            // Filter: EXCLUDE SuperAdmin and Admin. Only show specific Manager roles.
            const onlyManagers = (Array.isArray(adminData) ? adminData : []).filter(
                a => a.role !== 'SuperAdmin' && a.role !== 'Admin'
            );
            setManagers(onlyManagers);
        } catch (err) {
            message.error("Failed to load workforce data");
        } finally {
            setLoading(false);
        }
    };

    const refreshAssignedList = async (date = dayjs()) => {
        try {
            const data = await getDutyAssignments(date.format('YYYY-MM-DD'));
            setAssignedIdsToday((data || []).map(d => d.employee_id));
        } catch (e) { console.error("Sync error"); }
    };

    // --- 2. Filter Logic (This fixes your ReferenceError) ---
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [employees, searchTerm]);

    // --- 3. Duty List View Logic ---
    const fetchDutyRecords = async () => {
        try {
            setLoadingDuty(true);
            const dateStr = viewDate.format('YYYY-MM-DD');
            const data = await getDutyAssignments(dateStr);
            const mappedData = (data || []).map((record) => {
                const emp = employees.find(e => e.id === record.employee_id);
                const site = sites.find(s => s.id === record.site_id);
                const mgr = managers.find(m => m.id === record.manager_id);
                return {
                    id: record._id || record.id,
                    employee_name: emp ? emp.name : 'Unknown',
                    designation: emp ? emp.designation : '-',
                    site_name: site ? site.name : 'Unknown',
                    manager_name: mgr ? mgr.full_name : 'Assigned Manager'
                };
            });
            setDutyListRecords(mappedData);
        } catch (error) { setDutyListRecords([]); }
        finally { setLoadingDuty(false); }
    };

    useEffect(() => {
        if (isViewModalOpen) fetchDutyRecords();
    }, [isViewModalOpen, viewDate]);

    // --- 4. Selection Handlers ---
    const handleSelectEmployee = (id) => {
        if (assignedIdsToday.includes(id)) return; 
        setSelectedEmployees(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSubmitAssignment = async () => {
        try {
            const values = await form.validateFields();
            setIsSubmitting(true);

            const payload = selectedEmployees.map(eid => ({ 
                employee_id: eid, 
                site_id: parseInt(values.site_id), 
                manager_id: parseInt(values.manager_id),
                date: values.date.format('YYYY-MM-DD') 
            }));

            await saveDutyAssignments(payload);
            message.success("Workforce assigned to Manager successfully");
            setIsModalOpen(false);
            setSelectedEmployees([]);
            form.resetFields();
            refreshAssignedList(values.date);
        } catch (err) { 
            message.error("Deployment failed"); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    const handleDeleteDuty = async (id) => {
        try {
            await deleteDutyManual(id);
            message.success("Duty removed");
            fetchDutyRecords();
            refreshAssignedList(viewDate);
        } catch (e) { message.error("Delete failed"); }
    };

    if (loading) return <Spin fullscreen tip="Syncing Workforce Database..." />;

    return (
        <div className="layout-content">
            <Card variant="borderless" className="duty-header-card" style={{ marginBottom: 24 }}>
                <Row align="middle" justify="space-between">
                    <Col>
                        <Title level={3} style={{margin:0}}>Workforce Assignment</Title>
                        <Text type="secondary">Select employees to assign to a Manager's account.</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Input 
                                placeholder="Search employees..." 
                                prefix={<SearchOutlined />} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                            <Button type="primary" ghost icon={<EyeOutlined />} onClick={() => setIsViewModalOpen(true)}>
                                View Records
                            </Button>
                        </Space>
                    </Col>
                </Row>
                
                <Divider />

                <Row justify="space-between" align="middle">
                    <Checkbox 
                        onChange={(e) => {
                            const available = filteredEmployees.filter(emp => !assignedIdsToday.includes(emp.id));
                            setSelectedEmployees(e.target.checked ? available.map(emp => emp.id) : []);
                        }}
                        checked={selectedEmployees.length > 0 && selectedEmployees.length === filteredEmployees.filter(emp => !assignedIdsToday.includes(emp.id)).length}
                    >
                        Select All Available ({filteredEmployees.filter(emp => !assignedIdsToday.includes(emp.id)).length})
                    </Checkbox>
                    
                    <Space>
                        <Button 
                            type="primary" 
                            icon={<UserOutlined />}
                            disabled={selectedEmployees.length === 0} 
                            onClick={() => setIsModalOpen(true)} 
                            style={{ background: '#2a9d8f', border: 'none', height: 40, borderRadius: 8 }}
                        >
                            Assign to Manager ({selectedEmployees.length})
                        </Button>
                    </Space>
                </Row>
            </Card>

            <Row gutter={[20, 20]}>
                {filteredEmployees.map(emp => {
                    const isAssigned = assignedIdsToday.includes(emp.id);
                    const isSelected = selectedEmployees.includes(emp.id);
                    return (
                        <Col key={emp.id} xs={24} sm={12} md={8} lg={6}>
                            <Card 
                                variant="borderless"
                                className={`employee-card ${isAssigned ? 'assigned-blur' : ''} ${isSelected ? 'selected-card' : ''}`}
                                onClick={() => handleSelectEmployee(emp.id)}
                                style={{ cursor: isAssigned ? 'not-allowed' : 'pointer' }}
                            >
                                <div className="card-inner">
                                    <Avatar size={50} src={emp.image} style={{ backgroundColor: isAssigned ? '#bfbfbf' : '#2a9d8f' }}>{emp.name?.charAt(0)}</Avatar>
                                    <div className="emp-info">
                                        <Text strong>{emp.name}</Text>
                                        <Text type="secondary" style={{fontSize:12}}>{emp.designation}</Text>
                                        {isAssigned ? <Badge status="error" text="Assigned" /> : <Badge status="success" text="Available" />}
                                    </div>
                                    {!isAssigned && <Checkbox checked={isSelected} className="card-checkbox" />}
                                    {isAssigned && <CheckCircleOutlined style={{color:'#f5222d'}} />}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* MODAL: ASSIGN TO MANAGER */}
            <Modal 
                title="Workforce Assignment" 
                open={isModalOpen} 
                onOk={handleSubmitAssignment} 
                onCancel={() => setIsModalOpen(false)} 
                confirmLoading={isSubmitting}
                okText="Complete Assignment"
                destroyOnClose={true}
            >
                <Form form={form} layout="vertical" initialValues={{ date: dayjs() }}>
                    <Form.Item 
                        name="manager_id" 
                        label="Responsible Manager" 
                        rules={[{ required: true, message: 'Select a manager' }]}
                    >
                        <Select placeholder="Select Manager">
                            {managers.map(m => (
                                <Option key={m.id} value={m.id}>{m.full_name} (Manager)</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="site_id" label="Project Site" rules={[{ required: true }]}>
                        <Select placeholder="Select Site">
                            {sites.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="date" label="Assignment Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL: VIEW RECORDS */}
            <Modal title="Daily Records" open={isViewModalOpen} onCancel={() => setIsViewModalOpen(false)} footer={null} width={800}>
                <div style={{marginBottom:20}}>
                    <DatePicker value={viewDate} onChange={setViewDate} format="DD/MM/YYYY" allowClear={false} />
                </div>
                <Table 
                    columns={[
                        { title: 'Employee', dataIndex: 'employee_name' },
                        { title: 'Location', dataIndex: 'site_name', render: t => <Tag color="blue">{t}</Tag> },
                        { title: 'Manager', dataIndex: 'manager_name', render: t => <Tag color="green">{t}</Tag> },
                        { title: 'Action', render: (_, r) => (
                            <Popconfirm title="Remove assignment?" onConfirm={() => handleDeleteDuty(r.id)}>
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        )}
                    ]} 
                    dataSource={dutyListRecords} 
                    rowKey="id"
                    loading={loadingDuty} 
                />
            </Modal>
        </div>
    );
};

export default DutyListPage;