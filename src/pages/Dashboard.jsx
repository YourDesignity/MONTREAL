// src/pages/Dashboard.jsx
// Phase 6: Comprehensive Dashboard Overview

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Typography, Button, Space,
  Spin, Empty, Divider, Tag, Progress, Alert,
} from 'antd';
import {
  ProjectOutlined, TeamOutlined, ApartmentOutlined,
  UserOutlined, WarningOutlined, PlusOutlined,
  ReloadOutlined, BarChartOutlined, AuditOutlined,
  UsergroupAddOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../services/apiService.jsx';
import QuickActionButton from '../components/Dashboard/QuickActionButton.jsx';
import ProjectStatusCard from '../components/Dashboard/ProjectStatusCard.jsx';
import ContractExpiryAlert from '../components/Dashboard/ContractExpiryAlert.jsx';
import WorkforceGapCard from '../components/Dashboard/WorkforceGapCard.jsx';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/dashboard/summary');
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const quickActions = [
    {
      icon: <PlusOutlined />,
      label: 'New Project',
      description: 'Create a project',
      color: '#52c41a',
      onClick: () => navigate('/project-workflow'),
    },
    {
      icon: <UserOutlined />,
      label: 'Add Employee',
      description: 'Register employee',
      color: '#1677ff',
      onClick: () => navigate('/add-employee'),
    },
    {
      icon: <UsergroupAddOutlined />,
      label: 'Assign Workers',
      description: 'To a site',
      color: '#fa8c16',
      onClick: () => navigate('/workforce-allocation'),
    },
    {
      icon: <ApartmentOutlined />,
      label: 'All Projects',
      description: 'View workflow',
      color: '#722ed1',
      onClick: () => navigate('/project-workflow'),
    },
    {
      icon: <BarChartOutlined />,
      label: 'Analytics',
      description: 'View reports',
      color: '#eb2f96',
      onClick: () => navigate('/analytics'),
    },
    {
      icon: <FileSearchOutlined />,
      label: 'Project Report',
      description: 'Performance data',
      color: '#13c2c2',
      onClick: () => navigate('/analytics'),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Dashboard Error"
        description={error}
        action={
          <Button onClick={loadSummary} icon={<ReloadOutlined />}>
            Retry
          </Button>
        }
        style={{ margin: 24 }}
      />
    );
  }

  const s = summary || {};

  return (
    <div style={{ padding: '0 4px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          📊 Dashboard Overview
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadSummary} size="small">
          Refresh
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Projects"
              value={s.total_projects ?? 0}
              prefix={<ProjectOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
            <div style={{ marginTop: 4 }}>
              <Tag color="green" style={{ fontSize: 10 }}>{s.active_projects ?? 0} Active</Tag>
              <Tag color="blue" style={{ fontSize: 10 }}>{s.completed_projects ?? 0} Done</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #1677ff' }}>
            <Statistic
              title="Total Employees"
              value={s.total_employees ?? 0}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontSize: 22 }}
            />
            <div style={{ marginTop: 4 }}>
              <Tag color="green" style={{ fontSize: 10 }}>{s.available_employees ?? 0} Free</Tag>
              <Tag color="blue" style={{ fontSize: 10 }}>{s.assigned_employees ?? 0} Assigned</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #722ed1' }}>
            <Statistic
              title="Active Sites"
              value={s.total_sites ?? 0}
              prefix={<ApartmentOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontSize: 22 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #fa8c16' }}>
            <Statistic
              title="External Workers"
              value={s.active_external_workers ?? 0}
              prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontSize: 22 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>Currently active</Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #ff4d4f' }}>
            <Statistic
              title="Contract Alerts"
              value={s.contracts_expiring_soon ?? 0}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 22 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>Expiring ≤ 30 days</Text>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #13c2c2' }}>
            <Statistic
              title="Utilization"
              value={s.workforce_utilization ?? 0}
              suffix="%"
              prefix={<AuditOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2', fontSize: 22 }}
            />
            <Progress
              percent={s.workforce_utilization ?? 0}
              size="small"
              showInfo={false}
              strokeColor="#13c2c2"
              style={{ marginTop: 4 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Quick Actions ── */}
      <Card
        title="⚡ Quick Actions"
        size="small"
        style={{ borderRadius: 10, marginBottom: 20 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[12, 12]}>
          {quickActions.map((qa) => (
            <Col key={qa.label} xs={8} sm={6} md={4}>
              <QuickActionButton {...qa} />
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* ── Active Projects ── */}
        <Col xs={24} lg={14}>
          <Card
            title="🏗️ Active Projects"
            size="small"
            style={{ borderRadius: 10, marginBottom: 16 }}
            extra={
              <Button size="small" onClick={() => navigate('/project-workflow')}>
                View All
              </Button>
            }
          >
            {(s.projects ?? []).length === 0 ? (
              <Empty description="No active projects" imageStyle={{ height: 40 }} />
            ) : (
              <Row gutter={[12, 12]}>
                {(s.projects ?? []).slice(0, 6).map((project) => (
                  <Col key={project.project_id} xs={24} sm={12}>
                    <ProjectStatusCard project={project} />
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        {/* ── Right Column ── */}
        <Col xs={24} lg={10}>
          {/* Contract Expiry Alerts */}
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#fa8c16' }} />
                <span>Contract Expiry Alerts</span>
                {(s.expiring_contracts ?? []).length > 0 && (
                  <Tag color="orange">{(s.expiring_contracts ?? []).length}</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            {(s.expiring_contracts ?? []).length === 0 ? (
              <Empty description="No contracts expiring soon" imageStyle={{ height: 40 }} />
            ) : (
              (s.expiring_contracts ?? []).map((c) => (
                <ContractExpiryAlert key={c.contract_id} contract={c} />
              ))
            )}
          </Card>

          {/* Workforce Gaps */}
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: '#ff4d4f' }} />
                <span>Workforce Gaps</span>
                {(s.workforce_gaps ?? []).length > 0 && (
                  <Tag color="red">{(s.workforce_gaps ?? []).length}</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ borderRadius: 10 }}
            extra={
              <Button size="small" onClick={() => navigate('/workforce-allocation')}>
                Fix Gaps
              </Button>
            }
          >
            {(s.workforce_gaps ?? []).length === 0 ? (
              <Empty description="No workforce gaps" imageStyle={{ height: 40 }} />
            ) : (
              (s.workforce_gaps ?? []).slice(0, 5).map((gap) => (
                <WorkforceGapCard key={gap.site_id} gap={gap} />
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
