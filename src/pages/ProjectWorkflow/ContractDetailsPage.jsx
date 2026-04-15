import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Button, Table, Tag, Space, Statistic,
  Empty, message, Tabs, Breadcrumb, Spin, Typography, Progress,
  Alert, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, FileTextOutlined, EnvironmentOutlined,
  TeamOutlined, DollarOutlined, PlusOutlined, ProjectOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchWithAuth } from '../../services/apiService';
import './ContractDetailsPage.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
  Active: 'green',
  Completed: 'blue',
  'On Hold': 'orange',
  Cancelled: 'red',
  Expired: 'red',
};

const ContractDetailsPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [project, setProject] = useState(null);
  const [sites, setSites] = useState([]);
  const [workforce, setWorkforce] = useState(null);

  const fetchData = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const [detailsData, summaryData] = await Promise.all([
        fetchWithAuth(`/workflow/contracts/${contractId}`),
        fetchWithAuth(`/workflow/contracts/${contractId}/workforce-summary`),
      ]);

      setContract(detailsData?.contract || null);
      setSites(Array.isArray(detailsData?.sites) ? detailsData.sites : []);
      setProject(summaryData?.project || null);
      setWorkforce(summaryData);
    } catch (error) {
      console.error('Error fetching contract details:', error);
      message.error('Error loading contract details');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const siteColumns = [
    {
      title: 'Site Code',
      dataIndex: 'site_code',
      key: 'site_code',
      render: (text, record) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/project-workflow/sites/${record.uid}/details`)}
        >
          {text || `SITE-${record.uid}`}
        </Button>
      ),
    },
    {
      title: 'Site Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Manager',
      dataIndex: 'assigned_manager_name',
      key: 'assigned_manager_name',
      render: (name) => name || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: 'Workers',
      key: 'workers',
      render: (_, r) => `${r.assigned_workers} / ${r.required_workers}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/project-workflow/sites/${record.uid}/details`)}
        >
          View Details
        </Button>
      ),
    },
  ];

  const activeSites = sites.filter((s) => s.status === 'Active').length;

  const tabItems = [
    {
      key: 'sites',
      label: (
        <span>
          <EnvironmentOutlined /> Sites{' '}
          <Badge count={sites.length} style={{ backgroundColor: '#52c41a' }} />
        </span>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic title="Total Sites" value={sites.length} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic title="Active Sites" value={activeSites} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="Total Capacity"
                  value={sites.reduce((s, x) => s + (x.required_workers || 0), 0)}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
          <Table
            columns={siteColumns}
            dataSource={sites}
            rowKey="uid"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty description="No sites yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      navigate(`/project-workflow/${contract?.project_id}/sites`)
                    }
                  >
                    Add Site
                  </Button>
                </Empty>
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: 'workforce',
      label: (
        <span>
          <TeamOutlined /> Workforce
        </span>
      ),
      children: (
        <div>
          {workforce ? (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Company Employees"
                      value={workforce.company_employees}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Temp Workers"
                      value={workforce.temp_workers}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Temp Workers Cost"
                      value={Number(workforce.total_temp_cost || 0).toLocaleString()}
                      suffix="KD"
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small">
                    <Statistic
                      title="Fulfillment Rate"
                      value={Number(workforce.fulfillment_rate || 0).toFixed(1)}
                      suffix="%"
                      valueStyle={{
                        color:
                          workforce.fulfillment_rate >= 80
                            ? '#52c41a'
                            : workforce.fulfillment_rate >= 50
                            ? '#fa8c16'
                            : '#f5222d',
                      }}
                    />
                  </Card>
                </Col>
              </Row>
              <Card size="small" title="Workforce Utilization">
                <Progress
                  percent={Number(workforce.fulfillment_rate || 0).toFixed(1)}
                  strokeColor={
                    workforce.fulfillment_rate >= 80
                      ? '#52c41a'
                      : workforce.fulfillment_rate >= 50
                      ? '#fa8c16'
                      : '#f5222d'
                  }
                />
              </Card>
            </>
          ) : (
            <Empty description="Workforce data unavailable" />
          )}
        </div>
      ),
    },
    {
      key: 'financial',
      label: (
        <span>
          <DollarOutlined /> Financial Summary
        </span>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="Contract Value"
                  value={Number(contract?.contract_value || 0).toLocaleString()}
                  suffix="KD"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="Temp Workers Cost"
                  value={Number(workforce?.total_temp_cost || 0).toLocaleString()}
                  suffix="KD"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card size="small">
                <Statistic
                  title="Estimated Margin"
                  value={Number(
                    (contract?.contract_value || 0) - (workforce?.total_temp_cost || 0)
                  ).toLocaleString()}
                  suffix="KD"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>
          {contract?.payment_terms && (
            <Card size="small" title="Payment Terms" style={{ marginBottom: 12 }}>
              <Text>{contract.payment_terms}</Text>
            </Card>
          )}
          {contract?.notes && (
            <Card size="small" title="Notes">
              <Text>{contract.notes}</Text>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'activity',
      label: (
        <span>
          <ClockCircleOutlined /> Activity Log
        </span>
      ),
      children: (
        <div>
          <Card size="small" title="Contract Timeline">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {contract && (
                <div className="activity-item">
                  <Tag color="green">Created</Tag>
                  <Text>
                    Contract {contract.contract_code} created on{' '}
                    {contract.created_at
                      ? new Date(contract.created_at).toLocaleDateString()
                      : '—'}
                  </Text>
                </div>
              )}
              {sites.map((s) => (
                <div key={s.uid} className="activity-item">
                  <Tag color="blue">Site Added</Tag>
                  <Text>
                    Site {s.site_code || s.name} added{' '}
                    {s.start_date ? `starting ${s.start_date}` : ''}
                  </Text>
                </div>
              ))}
              {sites.length === 0 && contract && (
                <Text type="secondary">No activity recorded yet.</Text>
              )}
            </Space>
          </Card>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>Loading contract details...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Contract not found" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const daysRemaining = contract.days_remaining;
  const isExpiringSoon = daysRemaining != null && daysRemaining <= 30;

  return (
    <div className="contract-details-page">
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/project-workflow">Projects</Link>
        </Breadcrumb.Item>
        {project && (
          <Breadcrumb.Item>
            <Link to={`/project-workflow/${contract.project_id}/details`}>
              {project.project_name}
            </Link>
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item>Contracts</Breadcrumb.Item>
        <Breadcrumb.Item>{contract.contract_code}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Expiry warning */}
      {isExpiringSoon && (
        <Alert
          message={
            daysRemaining <= 0
              ? 'This contract has expired!'
              : `This contract expires in ${daysRemaining} day(s)!`
          }
          type={daysRemaining <= 7 ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> {contract.contract_code}
            </Title>
            {contract.contract_name && (
              <Text type="secondary">{contract.contract_name}</Text>
            )}
          </div>
        </div>
        <Space>
          {project && (
            <Button
              icon={<ProjectOutlined />}
              onClick={() => navigate(`/project-workflow/${contract.project_id}/details`)}
            >
              View Project
            </Button>
          )}
          <Button
            icon={<PlusOutlined />}
            onClick={() => navigate(`/project-workflow/${contract.project_id}/sites`)}
          >
            Add Site
          </Button>
        </Space>
      </div>

      {/* Contract Overview */}
      <Card className="overview-card" style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size={4}>
              {project && (
                <div>
                  <Text type="secondary">Project: </Text>
                  <Link to={`/project-workflow/${contract.project_id}/details`}>
                    <Text strong>{project.project_name}</Text>
                  </Link>
                </div>
              )}
              <div>
                <Text type="secondary">Period: </Text>
                <Text>
                  {contract.start_date} → {contract.end_date}
                </Text>
              </div>
              <div>
                <Text type="secondary">Contract Value: </Text>
                <Text strong style={{ color: '#52c41a' }}>
                  KD {Number(contract.contract_value || 0).toLocaleString()}
                </Text>
              </div>
              {daysRemaining != null && (
                <div>
                  <Text type="secondary">Days Remaining: </Text>
                  <Tag
                    color={
                      daysRemaining <= 7
                        ? 'red'
                        : daysRemaining <= 30
                        ? 'orange'
                        : 'green'
                    }
                  >
                    {daysRemaining} days
                  </Tag>
                </div>
              )}
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Tag
              color={STATUS_COLORS[contract.status] || 'default'}
              style={{ fontSize: 14, padding: '4px 12px' }}
            >
              {contract.status}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Contract Value"
              value={Number(contract.contract_value || 0).toLocaleString()}
              suffix="KD"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Total Sites"
              value={sites.length}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Company Workers"
              value={workforce?.company_employees || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small">
            <Statistic
              title="Temp Workers"
              value={workforce?.temp_workers || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card>
        <Tabs defaultActiveKey="sites" items={tabItems} />
      </Card>
    </div>
  );
};

export default ContractDetailsPage;
