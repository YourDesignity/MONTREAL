import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, InputNumber, Switch, Button, message, Row, Col, Typography, Alert, Divider } from 'antd';
import { SaveOutlined, SettingOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getCompanySettings, updateCompanySettings } from '../services/apiService';

const { Title, Text } = Typography;

function CompanySettingsPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);


    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getCompanySettings();
            setSettings(response);
        } catch (err) {
            message.error('Failed to load settings: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (settings) {
            form.setFieldsValue(settings);
        }
    }, [settings, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await updateCompanySettings(values);
            message.success('Company settings updated successfully');
            fetchSettings();
        } catch (err) {
            message.error('Failed to save settings: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="layout-content">
            <Card variant="borderless" style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <SettingOutlined style={{ marginRight: 8 }} />
                    Company Settings
                </Title>
                <Text type="secondary">Configure salary calculation parameters and business rules</Text>
            </Card>

            <Card variant="borderless" loading={loading}>
                <Alert
                    type="warning"
                    showIcon
                    title="Admin Only"
                    description="These settings affect all payslip calculations. Changes apply to future payslips immediately."
                    style={{ marginBottom: 24 }}
                />

                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Divider titlePlacement="left">
                        <ClockCircleOutlined /> Overtime Multipliers
                    </Divider>

                    <Row gutter={24}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="normal_overtime_multiplier"
                                label="Normal Overtime Rate"
                                tooltip="Multiplier for regular overtime hours (e.g., 1.25 = 25% premium)"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={1.0}
                                    max={3.0}
                                    step={0.05}
                                    precision={2}
                                    prefix="×"
                                    placeholder="1.25"
                                />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Example: 1.25 means employees get 125% of their hourly rate for normal OT
                            </Text>
                        </Col>

                        <Col xs={24} md={12}>
                            <Form.Item
                                name="offday_overtime_multiplier"
                                label="Off-Day Overtime Rate"
                                tooltip="Multiplier for off-day/weekend overtime hours"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={1.0}
                                    max={3.0}
                                    step={0.05}
                                    precision={2}
                                    prefix="×"
                                    placeholder="1.50"
                                />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Example: 1.50 means employees get 150% of their hourly rate for off-day OT
                            </Text>
                        </Col>
                    </Row>

                    <Divider titlePlacement="left">
                        <DollarOutlined /> Work Hours
                    </Divider>

                    <Row gutter={24}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="standard_hours_per_day"
                                label="Standard Hours Per Day"
                                tooltip="Number of work hours in a standard workday (used for hourly rate calculation)"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={6}
                                    max={12}
                                    step={1}
                                    suffix="hours"
                                    placeholder="8"
                                />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Used to calculate: Hourly Rate = Daily Rate ÷ Hours Per Day
                            </Text>
                        </Col>

                        <Col xs={24} md={12}>
                            <Form.Item
                                name="enable_absence_deduction"
                                label="Absence Deductions"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren="Enabled"
                                    unCheckedChildren="Disabled"
                                />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                When enabled, absent days are deducted from salaried employees' pay
                            </Text>
                        </Col>
                    </Row>

                    {settings?.last_updated && (
                        <Alert
                            type="info"
                            title={`Last updated: ${new Date(settings.last_updated).toLocaleString()} by ${settings.updated_by || 'Admin'}`}
                            style={{ marginTop: 24, marginBottom: 16 }}
                        />
                    )}

                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={saving}
                        size="large"
                        style={{ marginTop: 16 }}
                    >
                        Save Settings
                    </Button>
                </Form>
            </Card>
        </div>
    );
}

export default CompanySettingsPage;
