// src/pages/Dashboard.jsx
// Financial Profit & Loss Infographics Dashboard

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Typography, Button, Space,
  Spin, Tag, Alert, Progress,
} from 'antd';
import {
  DollarOutlined, LineChartOutlined, FundOutlined, WarningOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../services/apiService.jsx';

const { Title, Text } = Typography;

// ─── Simple inline chart components (no external library needed) ────────────

const PALETTE = ['#52c41a', '#1890ff', '#fa8c16', '#ff4d4f', '#722ed1', '#13c2c2'];

// Threshold below which a contract bar is considered "low profit" (30% of maximum)
const LOW_PROFIT_THRESHOLD = 0.3;

// Chart layout constants
const CHART_HEIGHT = 180;
const CHART_PADDING_TOP = 10;
const CHART_PADDING_BOTTOM = 20;

/** Vertical bar chart */
const MiniBarChart = ({ data, valueKey, nameKey, colors }) => {
  if (!data || data.length === 0) return <Text type="secondary">No data</Text>;
  const maxVal = Math.max(...data.map((d) => Math.abs(d[valueKey] || 0)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, padding: '0 4px' }}>
      {data.slice(0, 8).map((item, i) => {
        const val = item[valueKey] || 0;
        const pct = Math.round((Math.abs(val) / maxVal) * 100);
        const color = val < 0 ? '#ff4d4f' : (colors ? colors[i % colors.length] : PALETTE[i % PALETTE.length]);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#888' }}>
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </Text>
            <div
              style={{
                width: '100%',
                height: `${Math.max(pct, 4)}%`,
                background: color,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.5s',
              }}
            />
            <Text
              style={{ fontSize: 9, color: '#555', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2 }}
              title={item[nameKey]}
            >
              {String(item[nameKey] || '').slice(0, 10)}
            </Text>
          </div>
        );
      })}
    </div>
  );
};

/** Horizontal bar chart for profit by contract */
const HorizontalBarChart = ({ data, valueKey, nameKey }) => {
  if (!data || data.length === 0) return <Text type="secondary">No contract data available</Text>;
  const maxVal = Math.max(...data.map((d) => Math.abs(d[valueKey] || 0)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.slice(0, 6).map((item, i) => {
        const val = item[valueKey] || 0;
        const pct = Math.round((Math.abs(val) / maxVal) * 100);
        const color = val < 0 ? '#ff4d4f' : val < maxVal * LOW_PROFIT_THRESHOLD ? '#fa8c16' : '#52c41a';
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 11 }} title={item[nameKey]}>
                {String(item[nameKey] || '').slice(0, 20)}
              </Text>
              <Text style={{ fontSize: 11, color, fontWeight: 600 }}>
                {val >= 0 ? '+' : ''}{val >= 1000 || val <= -1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
              </Text>
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: 4, height: 12, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 4,
                  transition: 'width 0.5s',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Multi-series line chart */
const MultiLineChart = ({ data, series }) => {
  if (!data || data.length === 0) return <Text type="secondary">No trend data available</Text>;
  const allVals = data.flatMap((d) => series.map((s) => d[s.key] || 0));
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const getY = (val) =>
    CHART_HEIGHT -
    Math.round(((val - minVal) / range) * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM)) -
    CHART_PADDING_BOTTOM;

  const width = 100 / (data.length - 1 || 1);

  return (
    <div style={{ position: 'relative', height: CHART_HEIGHT + 30, overflow: 'hidden' }}>
      <svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 400 ${CHART_HEIGHT}`} preserveAspectRatio="none">
        {series.map((s) => {
          const points = data
            .map((d, i) => `${i * (400 / (data.length - 1 || 1))},${getY(d[s.key] || 0)}`)
            .join(' ');
          return (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              points={points}
            />
          );
        })}
      </svg>
      {/* X axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ fontSize: 10, color: '#888' }}>{d.month}</Text>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {series.map((s) => (
          <Space key={s.key} size={4}>
            <div style={{ width: 12, height: 3, background: s.color, borderRadius: 2 }} />
            <Text style={{ fontSize: 11 }}>{s.label}</Text>
          </Space>
        ))}
      </div>
    </div>
  );
};

/** Segmented pie chart */
const SimplePieChart = ({ segments }) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1;
  return (
    <div>
      {segments.map((seg, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <Space size={6}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color }} />
              <Text style={{ fontSize: 12 }}>{seg.label}</Text>
            </Space>
            <Text style={{ fontSize: 12 }}>{((seg.value / total) * 100).toFixed(1)}%</Text>
          </div>
          <Progress
            percent={Math.round((seg.value / total) * 100)}
            strokeColor={seg.color}
            showInfo={false}
            size="small"
          />
        </div>
      ))}
    </div>
  );
};

// ─── Main Dashboard Component ────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithAuth('/dashboard/profit-loss');
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading financial data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Dashboard Error"
        description={error}
        action={<Button onClick={loadData} icon={<ReloadOutlined />}>Retry</Button>}
        style={{ margin: 24 }}
      />
    );
  }

  const d = data || {};

  const formatCurrency = (value) => `$${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const costSegments = [
    { label: 'Employee Salaries', value: d.cost_breakdown?.employee_salaries || 0, color: '#52c41a' },
    { label: 'External Workers', value: d.cost_breakdown?.external_workers || 0, color: '#1890ff' },
  ];

  const trendSeries = [
    { key: 'revenue', label: 'Revenue', color: '#52c41a' },
    { key: 'costs', label: 'Costs', color: '#ff4d4f' },
    { key: 'profit', label: 'Profit', color: '#1890ff' },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>💰 Financial Dashboard</Title>
          <Text type="secondary">Profit &amp; Loss Analytics</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a', borderRadius: 10 }}>
            <Statistic
              title="Total Revenue"
              value={d.total_revenue || 0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              From {d.active_contracts || 0} active contracts
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 10 }}>
            <Statistic
              title="Total Costs"
              value={d.total_costs || 0}
              prefix={<FundOutlined style={{ color: '#ff4d4f' }} />}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>Employee + External</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #1890ff', borderRadius: 10 }}>
            <Statistic
              title="Net Profit"
              value={d.net_profit || 0}
              prefix={(d.net_profit || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: (d.net_profit || 0) >= 0 ? '#3f8600' : '#cf1322', fontSize: 20 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.profit_margin || 0}% overall margin
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: '4px solid #fa8c16', borderRadius: 10 }}>
            <Statistic
              title="Profitable Contracts"
              value={`${d.profitable_contracts || 0} / ${d.active_contracts || 0}`}
              prefix={<LineChartOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ fontSize: 20 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.at_risk_contracts || 0} at risk or in loss
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Revenue vs Costs Trend */}
        <Col xs={24} lg={14}>
          <Card title="📈 Revenue vs Costs Trend (Last 6 Months)" size="small" style={{ borderRadius: 10 }}>
            <MultiLineChart data={d.monthly_trend || []} series={trendSeries} />
          </Card>
        </Col>

        {/* Cost Distribution Pie */}
        <Col xs={24} lg={10}>
          <Card title="🥧 Cost Distribution" size="small" style={{ borderRadius: 10 }}>
            <SimplePieChart segments={costSegments} />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Tag color="green">
                Employee: {d.cost_breakdown?.employee_percentage || 0}%
              </Tag>
              <Tag color="blue">
                External: {d.cost_breakdown?.external_percentage || 0}%
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row 2 */}
      <Row gutter={[16, 16]}>
        {/* Profit by Contract */}
        <Col xs={24} lg={14}>
          <Card
            title="💰 Profit by Contract"
            size="small"
            style={{ borderRadius: 10 }}
            extra={
              <Button size="small" onClick={() => navigate('/project-workflow')}>
                View All
              </Button>
            }
          >
            <HorizontalBarChart
              data={d.contracts || []}
              valueKey="profit"
              nameKey="contract_name"
            />
          </Card>
        </Col>

        {/* At-Risk Contracts */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#fa8c16' }} />
                <span>At-Risk &amp; Loss Contracts</span>
                {(d.at_risk || []).length > 0 && (
                  <Tag color="orange">{(d.at_risk || []).length}</Tag>
                )}
              </Space>
            }
            size="small"
            style={{ borderRadius: 10, maxHeight: 370, overflow: 'auto' }}
          >
            {(d.at_risk || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Text type="secondary">✅ All contracts are profitable!</Text>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {(d.at_risk || []).map((contract) => (
                  <Card
                    key={contract.contract_id}
                    size="small"
                    style={{ backgroundColor: contract.status === 'loss' ? '#fff1f0' : '#fff7e6' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{contract.contract_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{contract.project_name}</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Tag color={contract.status_color}>{contract.status.toUpperCase()}</Tag>
                        <br />
                        <Text
                          style={{
                            fontSize: 12,
                            color: contract.profit < 0 ? '#cf1322' : '#fa8c16',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(contract.profit)} ({contract.margin}%)
                        </Text>
                      </div>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
