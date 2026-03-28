import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, Card, Input, Select, Button, Space, Avatar, Typography, Tag, Row, Col, Modal, Form, message 
} from 'antd';
import { 
  SearchOutlined, PlusOutlined, FileTextOutlined, 
  EditOutlined, DeleteOutlined, UserOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

// --- Services ---
import { 
    getEmployees, createPayslips, 
    updateEmployee, deleteEmployee, getManagers, getDutyAssignments 
} from '../services/apiService';
import websocketService from '../services/websocketService';
import { useAuth } from '../context/AuthContext'; 

// --- Typography Extraction ---
const { Title, Text } = Typography; // Added Title here
const { Option } = Select;

function EmployeesPage() {
    const navigate = useNavigate();
    const { user } = useAuth(); 
    const [form] = Form.useForm();

    const [employees, setEmployees] = useState([]);
    const [managers, setManagers] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    const [searchText, setSearchText] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('all');
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isPayslipLoading, setIsPayslipLoading] = useState(false);

    const isHighLevelAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';

    // --- 1. Load Data Function ---
    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const today = dayjs().format('YYYY-MM-DD');
            
            // Fetch necessary data based on role
            const promises = [getEmployees(), getDutyAssignments(today)];
            if (isHighLevelAdmin) promises.push(getManagers());

            const results = await Promise.all(promises);
            const empData = results[0] || [];
            const dutyData = results[1] || [];
            const adminData = isHighLevelAdmin ? (results[2] || []) : [];

            if (isHighLevelAdmin) {
                setEmployees(empData);
                setManagers(adminData);
            } else {
                // --- MANAGER LOGIC: Robust ID Matching ---
                const currentManagerId = parseInt(user.id);
                
                // Get IDs of employees assigned to this manager today from duty list
                const assignedEmployeeIds = dutyData
                    .filter(duty => parseInt(duty.manager_id) === currentManagerId)
                    .map(duty => duty.employee_id);

                // Filter employee master list by those IDs
                const myTeam = empData.filter(emp => {
                    const empId = emp.id || emp.uid; // Check both standard id and uid
                    return assignedEmployeeIds.includes(parseInt(empId));
                });
                
                setEmployees(myTeam);
            }
        } catch (e) {
            console.error("Load Error:", e);
            message.error("Failed to sync workforce data");
        } finally {
            setLoading(false);
        }
    }, [user, isHighLevelAdmin]);

    // --- 2. Lifecycle & WebSockets ---
    useEffect(() => {
        loadData();

        const handleWsMessage = (data) => {
            if (['employee_update', 'duty_update', 'employee_delete'].includes(data.type)) {
                loadData();
            }
        };

        websocketService.register(handleWsMessage);

        return () => {
            websocketService.unregister();
        };
    }, [loadData]);

    // --- 3. Filtering Logic ---
    const designations = useMemo(() => {
        const counts = {};
        employees.forEach(emp => {
            if(emp.designation) counts[emp.designation] = (counts[emp.designation] || 0) + 1;
        });
        return counts;
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name?.toLowerCase().includes(searchText.toLowerCase()) || 
                                  emp.designation?.toLowerCase().includes(searchText.toLowerCase());
            const matchesRole = selectedDesignation === 'all' || emp.designation === selectedDesignation;
            return matchesSearch && matchesRole;
        });
    }, [employees, searchText, selectedDesignation]);

    // --- 4. Handlers ---
    const handleCreatePayslips = async () => {
        if (selectedRowKeys.length === 0) return;
        setIsPayslipLoading(true);
        try {
            await createPayslips(selectedRowKeys);
            message.success('Payslips generated for selected team members');
            setSelectedRowKeys([]);
        } catch (err) { 
            message.error(err.message || "Failed to generate payslips"); 
        } finally { 
            setIsPayslipLoading(false); 
        }
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Delete Employee',
            content: 'Removing this employee will delete their historical records. Proceed?',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                try {
                    await deleteEmployee(id);
                    message.success("Employee removed successfully");
                    loadData();
                } catch (err) { message.error("Delete failed"); }
            }
        });
    };

    const openEditModal = (record) => {
        setEditingEmployee(record);
        form.setFieldsValue(record);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const vals = await form.validateFields();
            const empId = editingEmployee.id || editingEmployee.uid;
            await updateEmployee(empId, vals);
            message.success("Employee details updated");
            setIsEditModalOpen(false);
            loadData();
        } catch (err) {
            message.error("Update failed");
        }
    };

    const columns = [
        {
            title: 'Workforce Member',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <Avatar shape="square" icon={<UserOutlined />} src={record.image} />
                    <div>
                        <Text strong style={{ display: 'block' }}>{text}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.designation}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Finance Status',
            key: 'finance',
            render: (_, r) => (
                <Space>
                    <Tag color="blue">Rate: ${r.basic_salary}</Tag>
                    {r.allowance > 0 && <Tag color="cyan">Allow: ${r.allowance}</Tag>}
                </Space>
            )
        },
        {
            title: 'Actions',
            align: 'right',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    {isHighLevelAdmin && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id || record.uid)} />
                    )}
                </Space>
            )
        }
    ];

    return (
        <div className="layout-content">
            <Card variant="borderless" style={{ marginBottom: 24 }}>
                <Row align="middle" justify="space-between" gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={4} style={{ margin: 0 }}>
                            {isHighLevelAdmin ? "Workforce Grid" : "My Assigned Team (Today)"}
                        </Title>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Input 
                                placeholder="Search employees..." 
                                prefix={<SearchOutlined />} 
                                onChange={e => setSearchText(e.target.value)}
                                style={{ width: 200 }}
                            />
                            <Select value={selectedDesignation} onChange={setSelectedDesignation} style={{ width: 150 }}>
                                <Option value="all">All Roles</Option>
                                {Object.keys(designations).map(role => (
                                    <Option key={role} value={role}>{role}</Option>
                                ))}
                            </Select>
                            {isHighLevelAdmin && (
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />} 
                                    onClick={() => navigate('/add-employee')}
                                >
                                    Add Employee
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless">
                <Table 
                    columns={columns} 
                    dataSource={filteredEmployees} 
                    rowKey={(record) => record.id || record.uid}
                    loading={loading}
                    rowSelection={isHighLevelAdmin ? { 
                        selectedRowKeys, 
                        onChange: setSelectedRowKeys 
                    } : null}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal 
                title="Edit Employee Details" 
                open={isEditModalOpen} 
                onCancel={() => setIsEditModalOpen(false)}
                destroyOnHidden
                onOk={handleSaveEdit}
                okText="Save Changes"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="designation" label="Designation" rules={[{ required: true }]}><Input /></Form.Item>
                    
                    {isHighLevelAdmin && (
                        <Form.Item name="manager_id" label="Assign Reporting Manager">
                            <Select placeholder="Select Manager" allowClear>
                                {managers.map(m => (
                                    <Option key={m.id} value={m.id}>{m.full_name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="basic_salary" label="Basic Rate"><Input type="number" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="allowance" label="Fixed Allowance"><Input type="number" /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}

export default EmployeesPage;