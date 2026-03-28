import React, { useState } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  List, 
  Avatar, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Typography, 
  Space, 
  message,
  theme
} from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  GlobalOutlined, 
  LockOutlined, 
  MessageFilled,
  TeamOutlined 
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { useToken } = theme;

// --- RECIPIENT LIST (Super Admin Removed) ---
const AVAILABLE_RECIPIENTS = [
  { id: 'all', name: 'Everyone (Broadcast)', type: 'public' },
  { id: 'mgr1', name: 'Site Manager (West-Side)', type: 'private' },
  { id: 'emp1', name: 'Nachiappan (Driver)', type: 'private' },
  { id: 'emp2', name: 'Sarath Kumar (Welder)', type: 'private' },
];

const MessagePage = () => {
  const { user } = useAuth();
  const { token } = useToken();
  const [loading, setLoading] = useState(false);

  // --- MOCK MESSAGES ---
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "System Admin",
      role: "Director",
      content: "Welcome to the new system. Please ensure all profiles are updated by Friday.",
      time: "2 hours ago",
      to: "Everyone (Broadcast)",
      type: "public"
    },
    {
      id: 2,
      sender: "Site Manager",
      role: "West-Side Supervisor",
      content: "I have approved the leave request for Sarath.",
      time: "5 hours ago",
      to: "Nachiappan (Driver)", // Changed from Super Admin to a Driver
      type: "private"
    }
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("all");

  // --- HANDLERS ---
  const handleSend = () => {
    if (!newMessage.trim()) return;
    setLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const recipientObj = AVAILABLE_RECIPIENTS.find(r => r.id === selectedRecipient);

      const newMsg = {
        id: messages.length + 1,
        sender: user?.sub?.split('@')[0] || "Me",
        role: user?.role || "Admin",
        content: newMessage,
        time: "Just now",
        to: recipientObj.name,
        type: recipientObj.type
      };

      setMessages([newMsg, ...messages]);
      setNewMessage("");
      setLoading(false);
      message.success("Message sent successfully!");
    }, 600);
  };

  // --- STYLES ---
  const styles = {
    pageContainer: {
      padding: '0 24px 24px 24px', 
      maxWidth: '1200px',
      margin: '0 auto'
    },
    composeCard: {
      borderRadius: '12px',
      boxShadow: token.boxShadowSecondary,
      border: 'none',
      position: 'sticky',
      top: '20px' 
    },
    messageItem: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid #f0f0f0',
      transition: 'all 0.3s',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    },
    privateIndicator: {
      borderLeft: '4px solid #faad14' 
    },
    publicIndicator: {
      borderLeft: '4px solid #52c41a' 
    }
  };

  // --- CSS INJECTION ---
  const internalCss = `
    .message-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
      transform: translateY(-2px);
    }
  `;

  return (
    <>
      <style>{internalCss}</style>
      
      <div style={styles.pageContainer}>
        {/* Page Title Section */}
        <div style={{ marginBottom: '24px', marginTop: '10px' }}>
          <Title level={3} style={{ marginBottom: '0' }}>
            <MessageFilled style={{ color: '#1890ff', marginRight: '10px' }} />
            Team Communication
          </Title>
          <Text type="secondary">Broadcast announcements or send private notes to staff.</Text>
        </div>

        <Row gutter={[24, 24]}>
          
          {/* --- LEFT: MESSAGE FEED --- */}
          <Col xs={24} lg={16}>
            <List
              dataSource={messages}
              split={false}
              renderItem={(item) => (
                <div 
                  className="message-card"
                  style={{
                    ...styles.messageItem,
                    ...(item.type === 'private' ? styles.privateIndicator : styles.publicIndicator)
                  }}
                >
                  {/* Header: Avatar, Name, Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Space align="start">
                      <Avatar 
                        size={48} 
                        icon={<UserOutlined />} 
                        style={{ 
                          backgroundColor: item.type === 'private' ? '#faad14' : '#87d068',
                          verticalAlign: 'middle'
                        }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: '15px' }}>{item.sender}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{item.role}</Text>
                      </div>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{item.time}</Text>
                  </div>

                  {/* Body: Message Content */}
                  <div style={{ paddingLeft: '60px' }}>
                    <Paragraph style={{ fontSize: '15px', color: '#434343', marginBottom: '12px' }}>
                      {item.content}
                    </Paragraph>
                    
                    {/* Footer: Recipient Tag */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {item.type === 'public' ? (
                        <Tag icon={<GlobalOutlined />} color="success">
                          To: Everyone
                        </Tag>
                      ) : (
                        <Tag icon={<LockOutlined />} color="warning">
                          To: {item.to}
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </Col>

          {/* --- RIGHT: COMPOSE BOX --- */}
          <Col xs={24} lg={8}>
            <Card title="Post an Update" bordered={false} style={styles.composeCard}>
              <div style={{ marginBottom: '20px' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Send To:</Text>
                <Select
                  value={selectedRecipient}
                  onChange={(val) => setSelectedRecipient(val)}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {AVAILABLE_RECIPIENTS.map(r => (
                    <Option key={r.id} value={r.id}>
                      <Space>
                        {r.type === 'public' ? <GlobalOutlined style={{ color: '#52c41a' }} /> : <LockOutlined style={{ color: '#faad14' }} />}
                        {r.name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Message:</Text>
                <TextArea
                  rows={6}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  style={{ resize: 'none', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Posting as: <Text strong>{user?.sub?.split('@')[0] || "Admin"}</Text>
                </Text>
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  onClick={handleSend}
                  loading={loading}
                  size="large"
                  shape="round"
                >
                  Send
                </Button>
              </div>
            </Card>

            {/* Helper Info Card */}
            <Card 
              style={{ marginTop: '24px', borderRadius: '12px', background: '#f9f9f9', border: '1px dashed #d9d9d9' }} 
              bordered={false}
            >
              <Space direction="vertical" size={2}>
                <Text strong><TeamOutlined /> Quick Tip:</Text>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  Broadcasts are visible to all employees. Private messages only appear for the selected staff member.
                </Text>
              </Space>
            </Card>
          </Col>

        </Row>
      </div>
    </>
  );
};

export default MessagePage;