import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Progress, Divider, Spin, Tag, Empty, Result, Button } from 'antd';
import { BiPieChartAlt2, BiUserVoice, BiBriefcase, BiBus, BiTimer } from 'react-icons/bi';
import { Pie } from '@ant-design/charts';
import '../styles/FinancePage.css';
import { getFinancialSummary } from '../services/apiService';
import { useAuth } from '../context/AuthContext'; // Import Auth

const { Title, Text } = Typography;

const FinancePage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    // --- SECURITY: HARD CHECK FOR MANAGERS ---
    const isOwner = user?.role === 'SuperAdmin' || user?.role === 'Admin';

    useEffect(() => {
        if (isOwner) {
            const loadData = async () => {
                try {
                    const result = await getFinancialSummary();
                    setData(result);
                } catch (e) {
                    console.error("Finance Error", e);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }
    }, [isOwner]);

    // If User is a Manager, show Access Denied UI instead of numbers
    if (!isOwner) {
        return (
            <Result
                status="403"
                title="Unauthorized Access"
                subTitle="Managers are not permitted to view corporate financial Profit & Loss statements."
                extra={<Button type="primary" href="/dashboard">Back to Dashboard</Button>}
            />
        );
    }

    if (loading) return <div style={{padding: 100, textAlign: 'center'}}><Spin size="large" description="Loading Confidential Data..." /></div>;

    const chartConfig = {
        data: [
            { type: 'Workforce', value: data?.expenses?.hr || 0 },
            { type: 'Projects', value: data?.expenses?.projects || 0 },
            { type: 'Fleet', value: data?.expenses?.fleet || 0 },
        ],
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        innerRadius: 0.6,
        label: { type: 'inner', content: '{percentage}' },
    };

    return (
        <div className="finance-container">
            <Title level={2}><BiPieChartAlt2 /> Corporate Profit & Loss Audit</Title>
            <Text type="secondary">Financial data restricted to Business Owners only.</Text>

            <Row gutter={[20, 20]} style={{ marginTop: 24, marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <Card variant="borderless" className="fin-stat-card revenue-glow">
                        <Statistic title="Total Billed Revenue" value={data?.revenue?.billed} precision={2} suffix="KWD" />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card variant="borderless" className="fin-stat-card expense-glow">
                        <Statistic title="Total Expenses" value={data?.expenses?.total} precision={2} suffix="KWD" />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card variant="borderless" className="fin-stat-card profit-glow">
                        <Statistic title="Net Profit" value={data?.net_profit} precision={2} styles={{ content: { color: data?.net_profit >= 0 ? '#3f8600' : '#cf1322' } }} suffix="KWD" />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card variant="borderless" className="fin-stat-card info-glow">
                        <Statistic title="Efficiency" value={data?.metrics?.profit_per_man_hour} precision={2} suffix="KWD/hr" />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card title="Expense Breakdown" variant="borderless" className="finance-main-card">
                        <Pie {...chartConfig} />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Audit Ledger" variant="borderless" className="finance-main-card">
                        <div className="audit-item">
                            <div className="audit-icon labor-bg"><BiUserVoice /></div>
                            <div className="audit-info"><Text strong>Workforce Payout</Text></div>
                            <div className="audit-value">{data?.expenses?.hr?.toLocaleString()} KWD</div>
                        </div>
                        <Divider />
                        <div className="audit-item">
                            <div className="audit-icon project-bg"><BiBriefcase /></div>
                            <div className="audit-info"><Text strong>Project Materials</Text></div>
                            <div className="audit-value">{data?.expenses?.projects?.toLocaleString()} KWD</div>
                        </div>
                        <Divider />
                        <div className="audit-item">
                            <div className="audit-icon vehicle-bg"><BiBus /></div>
                            <div className="audit-info"><Text strong>Fleet Operations</Text></div>
                            <div className="audit-value">{data?.expenses?.fleet?.toLocaleString()} KWD</div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default FinancePage;