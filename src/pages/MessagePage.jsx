import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Card, List, Avatar, Button, Input, Tag, Typography, Space, 
  message, theme, Row, Col, Spin, Badge, Empty 
} from 'antd';
import { 
  SendOutlined, UserOutlined, GlobalOutlined, MessageFilled,
  TeamOutlined, ReloadOutlined, CommentOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

const API_BASE_URL = 'http://localhost:8000';

const MessagePage = () => {
  const { user } = useAuth();
  const { token } = useToken();
  
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Ref to always have the latest selectedConversation inside the polling interval
  const selectedConversationRef = useRef(null);

  // =============================================================================
  // API HELPERS
  // =============================================================================

  const getAuthHeaders = () => {
    const accessToken = localStorage.getItem('access_token');
    return { headers: { 'Authorization': `Bearer ${accessToken}` } };
  };

  // =============================================================================
  // LOAD DATA
  // =============================================================================

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/messages/conversations`, getAuthHeaders());
      setConversations(res.data);
    } catch (err) {
      message.error("Failed to load conversations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/messages/${conversationId}/messages`, getAuthHeaders());
      setMessages(res.data);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
      
    } catch (err) {
      message.error("Failed to load messages");
      console.error(err);
    }
  };

  // Initial load
  useEffect(() => {
    loadConversations();
    
    // Poll for new messages every 5 seconds using ref so interval always has latest value
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConversationRef.current) {
        loadMessages(selectedConversationRef.current.id);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Load messages when conversation is selected, and keep ref in sync
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // =============================================================================
  // SEND REPLY
  // =============================================================================

  const handleReply = async () => {
    if (!newMessage.trim() || !selectedConversation) {
      message.warning("Please type a message");
      return;
    }

    try {
      setSendingReply(true);
      
      await axios.post(
        `${API_BASE_URL}/messages/${selectedConversation.id}/reply`,
        null,
        {
          ...getAuthHeaders(),
          params: { content: newMessage }
        }
      );
      
      message.success("Reply sent!");
      setNewMessage("");
      
      // Reload messages and conversation list
      await loadMessages(selectedConversation.id);
      await loadConversations();
      
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to send reply");
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  const getConversationIcon = (type) => {
    switch(type) {
      case 'broadcast_all': return <GlobalOutlined style={{ color: '#1890ff' }} />;
      case 'broadcast_managers': return <TeamOutlined style={{ color: '#52c41a' }} />;
      case 'broadcast_employees': return <UserOutlined style={{ color: '#fa8c16' }} />;
      case 'broadcast_custom': return <MessageFilled style={{ color: '#722ed1' }} />;
      case 'private': return <CommentOutlined style={{ color: '#eb2f96' }} />;
      default: return <MessageFilled />;
    }
  };

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
  }, [conversations]);

  const formatTimestamp = (timestamp) => {
    return dayjs(timestamp).fromNow();
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '1600px', 
      margin: '0 auto', 
      height: 'calc(100vh - 100px)' 
    }}>
      
      {/* HEADER */}
      <Card variant="borderless" style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <MessageFilled style={{ marginRight: 8, color: '#1890ff' }} />
              Messages
              {totalUnread > 0 && (
                <Badge 
                  count={totalUnread} 
                  style={{ marginLeft: 12 }}
                  overflowCount={99}
                />
              )}
            </Title>
            <Text type="secondary">Team communication and broadcasts</Text>
          </Col>
          <Col>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                loadConversations();
                if (selectedConversation) loadMessages(selectedConversation.id);
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* MAIN CONTENT */}
      <Row gutter={24} style={{ height: 'calc(100% - 120px)' }}>
        
        {/* LEFT: CONVERSATION LIST */}
        <Col xs={24} md={8} style={{ height: '100%' }}>
          <Card 
            title={
              <Space>
                <span>Conversations</span>
                <Badge 
                  count={conversations.length} 
                  style={{ backgroundColor: '#1890ff' }} 
                  overflowCount={999}
                />
              </Space>
            }
            bordered={false}
            bodyStyle={{ 
              height: 'calc(100% - 60px)', 
              overflowY: 'auto', 
              padding: 12 
            }}
            style={{ height: '100%' }}
          >
            {loading && conversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="Loading conversations..." />
              </div>
            )}
            
            {!loading && conversations.length === 0 && (
              <Empty 
                description="No conversations yet" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}

            <List
              dataSource={conversations}
              renderItem={conv => (
                <List.Item
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedConversation?.id === conv.id ? '#e6f7ff' : 'transparent',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    border: selectedConversation?.id === conv.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedConversation?.id !== conv.id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedConversation?.id !== conv.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conv.unread_count} offset={[-5, 5]}>
                        <Avatar 
                          icon={getConversationIcon(conv.type)} 
                          style={{ 
                            backgroundColor: selectedConversation?.id === conv.id ? '#1890ff' : '#f0f0f0',
                            color: selectedConversation?.id === conv.id ? 'white' : '#666'
                          }}
                          size={40}
                        />
                      </Badge>
                    }
                    title={
                      <Text strong style={{ fontSize: 14 }}>
                        {conv.title}
                      </Text>
                    }
                    description={
                      <div>
                        <Text 
                          type="secondary" 
                          ellipsis 
                          style={{ fontSize: 12, display: 'block' }}
                        >
                          {conv.last_message_preview || "No messages yet"}
                        </Text>
                        <Space style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatTimestamp(conv.last_message_at)}
                          </Text>
                          <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                            {conv.participant_count} {conv.participant_count === 1 ? 'person' : 'people'}
                          </Tag>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* RIGHT: MESSAGE THREAD */}
        <Col xs={24} md={16} style={{ height: '100%' }}>
          <Card 
            title={
              selectedConversation ? (
                <Space>
                  {getConversationIcon(selectedConversation.type)}
                  <span>{selectedConversation.title}</span>
                  <Tag color="blue">
                    {selectedConversation.participant_count} {selectedConversation.participant_count === 1 ? 'person' : 'people'}
                  </Tag>
                </Space>
              ) : "Select a conversation"
            }
            bordered={false}
            bodyStyle={{ 
              height: 'calc(100% - 60px)', 
              display: 'flex', 
              flexDirection: 'column',
              padding: 0
            }}
            style={{ height: '100%' }}
          >
            {!selectedConversation && (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#fafafa'
              }}>
                <Empty 
                  description="Select a conversation to view messages" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}

            {selectedConversation && (
              <>
                {/* MESSAGES */}
                <div 
                  id="messages-container"
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '16px 24px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Empty 
                        description="No messages yet" 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      />
                    </div>
                  )}
                  
                  {messages.map(msg => {
                    const isMyMessage = msg.sender_id === user?.uid;
                    
                    return (
                      <div 
                        key={msg.id}
                        style={{
                          marginBottom: 16,
                          display: 'flex',
                          justifyContent: isMyMessage ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          {!isMyMessage && (
                            <Space style={{ marginBottom: 4 }}>
                              <Text strong style={{ fontSize: 12 }}>
                                {msg.sender_name}
                              </Text>
                              <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                {msg.sender_role}
                              </Tag>
                            </Space>
                          )}
                          <div
                            style={{
                              background: isMyMessage ? '#1890ff' : 'white',
                              color: isMyMessage ? 'white' : 'black',
                              padding: '12px 16px',
                              borderRadius: 12,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              wordWrap: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {msg.content}
                          </div>
                          <Text 
                            type="secondary" 
                            style={{ 
                              fontSize: 11, 
                              display: 'block', 
                              marginTop: 4,
                              textAlign: isMyMessage ? 'right' : 'left'
                            }}
                          >
                            {dayjs(msg.timestamp).format('MMM D, h:mm A')}
                            {msg.is_read && isMyMessage && (
                              <span style={{ marginLeft: 8 }}>✓ Read</span>
                            )}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* REPLY BOX */}
                <div style={{ 
                  padding: 16, 
                  borderTop: '1px solid #f0f0f0', 
                  backgroundColor: 'white' 
                }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <TextArea
                      placeholder="Type your reply... (Shift+Enter for new line)"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          handleReply();
                        }
                      }}
                      style={{ borderRadius: '8px 0 0 8px' }}
                      disabled={sendingReply}
                    />
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={handleReply}
                      disabled={!newMessage.trim()}
                      loading={sendingReply}
                      style={{ 
                        height: 'auto', 
                        borderRadius: '0 8px 8px 0',
                        minWidth: 80
                      }}
                    >
                      Send
                    </Button>
                  </Space.Compact>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

    </div>
  );
}

export default MessagePage;