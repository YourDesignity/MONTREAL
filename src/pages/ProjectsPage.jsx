import React, { useState, useEffect } from 'react';
import '../styles/projectsPage.css'; 
import { 
  BiBuilding, BiFile, BiCalendar, BiPlus, BiTrendingUp, BiWallet, BiDetail, BiHistory, 
  BiMoney, BiTrendingDown, BiReceipt, BiPrinter, BiLockAlt
} from 'react-icons/bi';
import { 
  Modal, Form, Input, DatePicker, Select, Button, message, 
  InputNumber, Space, Typography, Table, Tag, Progress, Card, Row, Col, Drawer, Divider, Statistic, Tabs 
} from 'antd';
import { MinusCircleOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';

// API Service
import { 
  getContracts, addContract, addProjectExpense, 
  getInvoices, createInvoice, payInvoice, downloadInvoicePDF 
} from '../services/apiService';

const { Option } = Select;
const { Title, Text } = Typography;

const ProjectsPage = () => {
  const [activeTab, setActiveTab] = useState('ongoing'); 
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(''); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [form] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [invoiceForm] = Form.useForm();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
        try { setUserRole(jwtDecode(token).role || 'Manager'); } catch (e) {}
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, i] = await Promise.all([getContracts(), getInvoices()]);
      setContracts(Array.isArray(c) ? c : []);
      setInvoices(Array.isArray(i) ? i : []);
    } catch (error) { message.error("Database connection lost."); }
    finally { setLoading(false); }
  };

  const isOwner = userRole === 'SuperAdmin' || userRole === 'Admin';

  const totalBudget = contracts.reduce((acc, curr) => acc + (curr.total_value || 0), 0);
  const totalExpenses = contracts.reduce((acc, curr) => acc + (curr.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0), 0);
  const totalInvoiced = invoices.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const netProfit = totalBudget - totalExpenses;

  const handleMarkAsPaid = async (invUid) => {
    if (!isOwner) return message.error("Admins only.");
    try {
        await payInvoice(invUid);
        message.success("Invoice fully paid"); fetchData();
    } catch (e) { message.error("Error"); }
  };

  const handleDownloadPDF = async (uid, invNo) => {
      try {
          message.loading({ content: 'Generating Premium Invoice...', key: 'p_load' });
          await downloadInvoicePDF(uid, invNo);
          message.success({ content: 'Ready for print', key: 'p_load' });
      } catch (e) { message.error({ content: 'Error: Is backend running?', key: 'p_load' }); }
  };

  const renderContractCard = (item) => {
    const totalExp = item.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const progress = Math.min(Math.round((totalExp / (item.total_value || 1)) * 100), 100);

    return (
      <div key={item.uid} className={`project-card ${item.contract_type === 'Labour' ? 'labour-border' : 'goods-border'}`}>
        <div className="card-top">
          <h3>{item.title}</h3>
          <Tag color="green">Active</Tag>
        </div>
        <div className="contract-meta">
          <p className="client-value">{item.client}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
              <span className="contract-value-tag">Budget: {item.total_value}</span>
              <span className="contract-value-tag" style={{ color: totalExp > item.total_value ? 'red' : 'green' }}>Spent: {totalExp}</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto' }}>
           <Progress percent={progress} strokeColor={totalExp > item.total_value ? '#ef4444' : ''} railColor="#f1f5f9" />
           <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button className="btn-primary-modern" style={{ flex: 1 }} onClick={() => { setSelectedProject(item); setIsExpenseModalOpen(true); }}>Log Expense</button>
              <button className="btn-outline-modern" onClick={() => { setSelectedProject(item); setIsDetailsDrawerOpen(true); }}><BiDetail /></button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="projects-container">
      <div className="projects-header">
        <Title level={2} style={{margin:0}}>Montreal Intl. Projects</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="project-tabs">
            <button className={`tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`} onClick={() => setActiveTab('ongoing')}>Ongoing</button>
            <button className={`tab-btn ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>Registry</button>
          </div>
          {isOwner && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ height: 45, borderRadius: 10, background: '#22c55e', border: 'none' }}>Launch Project</Button>}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px', marginTop: 20 }}>
        <Col xs={24} sm={6}><Card variant="borderless" className="summary-stat-card"><Statistic title="Revenue" value={totalBudget} suffix="KWD" /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless" className="summary-stat-card"><Statistic title="Billed" value={totalInvoiced} suffix="KWD" /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless" className="summary-stat-card"><Statistic title="Expenses" value={totalExpenses} styles={{ content: { color: '#cf1322' } }} suffix="KWD" /></Card></Col>
        <Col xs={24} sm={6}><Card variant="borderless" className="summary-stat-card"><Statistic title="Profit" value={netProfit} styles={{ content: { color: netProfit >= 0 ? 'green' : 'red' } }} suffix="KWD" /></Card></Col>
      </Row>

      <div className="projects-content">
        {activeTab === 'ongoing' ? <div className="grid-view">{contracts.map(renderContractCard)}</div> : 
        <Card variant="borderless" style={{ borderRadius: 16 }}><Table dataSource={contracts} rowKey="uid" columns={[{ title: 'Project', dataIndex: 'title' }, { title: 'Budget', dataIndex: 'total_value' }]} /></Card>}
      </div>

      <Drawer title="Project Audit & Ledger" size="large" onClose={() => setIsDetailsDrawerOpen(false)} open={isDetailsDrawerOpen}>
        {selectedProject && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
                <Title level={4}>{selectedProject.title}</Title>
                {isOwner && <Button type="primary" icon={<BiReceipt />} onClick={() => setIsInvoiceModalOpen(true)}>Generate Invoice</Button>}
            </div>
            <Tabs items={[
                { 
                    key: '1', label: 'Expenses', 
                    children: <Table dataSource={selectedProject.expenses} rowKey={(r) => `${r.date}-${r.amount}`} columns={[{title:'Date', dataIndex:'date', render: d => dayjs(d).format('DD MMM')}, {title:'Notes', dataIndex:'description'}, {title:'Amount', dataIndex:'amount'}]} />
                },
                { 
                    key: '2', label: 'Official Invoices', 
                    children: <Table dataSource={invoices.filter(i => i.project_uid === selectedProject.uid)} rowKey="uid" columns={[
                        {title:'Inv #', dataIndex:'invoice_no'}, 
                        {title:'Status', dataIndex:'status', render: s => <Tag color={s==='Paid'?'green':'orange'}>{s}</Tag>},
                        {title:'Actions', render: (_, r) => (
                            <Space>
                                <Button size="small" icon={<BiPrinter />} onClick={() => handleDownloadPDF(r.uid, r.invoice_no)}>Print</Button>
                                {r.status === 'Unpaid' && isOwner && <Button size="small" type="primary" onClick={() => handleMarkAsPaid(r.uid)}>Mark Paid</Button>}
                            </Space>
                        )}
                    ]} />
                }
            ]} />
          </div>
        )}
      </Drawer>

      <Modal title="Launch Project" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={async () => { const v = await form.validateFields(); await addContract({...v, contract_type: 'Labour'}); setIsModalOpen(false); fetchData(); }}>
        <Form form={form} layout="vertical"><Form.Item name="title" label="Title" rules={[{required:true}]}><Input /></Form.Item><Form.Item name="client" label="Client" rules={[{required:true}]}><Input /></Form.Item><Form.Item name="total_value" label="Value" rules={[{required:true}]}><InputNumber style={{width:'100%'}}/></Form.Item></Form>
      </Modal>

      <Modal title="Generate Invoice" open={isInvoiceModalOpen} onCancel={() => setIsInvoiceModalOpen(false)} onOk={async () => { const v = await invoiceForm.validateFields(); await createInvoice({...v, project_uid: selectedProject.uid, client_name: selectedProject.client, date: dayjs().format('YYYY-MM-DD'), due_date: v.due_date.format('YYYY-MM-DD'), items: []}); setIsInvoiceModalOpen(false); fetchData(); }}>
        <Form form={invoiceForm} layout="vertical"><Form.Item name="total_amount" label="Amount" rules={[{required:true}]}><InputNumber style={{width:'100%'}}/></Form.Item><Form.Item name="due_date" label="Due Date" rules={[{required:true}]}><DatePicker style={{width:'100%'}}/></Form.Item></Form>
      </Modal>

      <Modal title="Log Expense" open={isExpenseModalOpen} onCancel={() => setIsExpenseModalOpen(false)} onOk={async () => { const v = await expenseForm.validateFields(); await addProjectExpense(selectedProject.uid, {...v, date: dayjs().toISOString()}); setIsExpenseModalOpen(false); fetchData(); }}>
        <Form form={expenseForm} layout="vertical"><Form.Item name="amount" label="Amount" rules={[{required:true}]}><InputNumber style={{width:'100%'}}/></Form.Item><Form.Item name="description" label="Notes" rules={[{required:true}]}><Input.TextArea /></Form.Item></Form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;