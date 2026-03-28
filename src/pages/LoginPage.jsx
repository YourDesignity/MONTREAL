import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Layout,
  Menu,
  Button,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Switch,
  message,
} from "antd";
import {
  TwitterOutlined,
  InstagramOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";

const signinbg = "https://assets-v2.lottiefiles.com/a/30812cc4-1175-11ee-9129-134c71276cc8/Ws4zxxFQvP.gif";

const { Title } = Typography;
const { Header, Footer, Content } = Layout;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Create Form Instance
  const [form] = Form.useForm();

  // Load Saved Credentials
  useEffect(() => {
    const savedUser = localStorage.getItem("rememberedUser");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      form.setFieldsValue({
        email: parsedUser.email,
        password: parsedUser.password,
        remember: true,
      });
    }
  }, [form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      
      // Handle "Remember Me" Logic
      if (values.remember) {
        localStorage.setItem(
          "rememberedUser",
          JSON.stringify({ email: values.email, password: values.password })
        );
      } else {
        localStorage.removeItem("rememberedUser");
      }

      message.success("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      message.error(error.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
    message.error("Please fill in all required fields.");
  };

  // --- Menu Items for Header ---
  const headerMenuItems = [
    {
      key: "1",
      label: (
        <Link to="/dashboard">
          <b>LOGIN</b>
        </Link>
      ),
    },
  ];

  // --- Menu Items for Footer ---
  const footerSocialItems = [
    {
      key: "twitter",
      label: <a href="https://twitter.com"><TwitterOutlined style={{ color: "#8c8c8c" }} /></a>,
    },
    {
      key: "instagram",
      label: <a href="https://instagram.com"><InstagramOutlined style={{ color: "#8c8c8c" }} /></a>,
    },
    {
      key: "github",
      label: <a href="https://github.com"><GithubOutlined style={{ color: "#8c8c8c" }} /></a>,
    },
  ];

  return (
    <Layout 
      className="layout-default layout-signin"
      style={{ 
        height: "100vh",      
        overflow: "hidden",   
        backgroundColor: "#ffffff" 
      }} 
    >
      <Header style={{ background: "#ffffff", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="header-brand">
          <h5 style={{ color: "#141414", margin: 0, fontSize: "18px", fontWeight: "bold" }}>Montreal Intl.</h5>
        </div>
        
        <div className="header-nav" style={{ flex: 1, display: "flex", justifyContent: "flex-end", marginRight: "20px" }}>
           <Menu 
             mode="horizontal" 
             defaultSelectedKeys={["1"]} 
             items={headerMenuItems} 
             style={{ borderBottom: "none", minWidth: "100px", justifyContent: "end" }}
           />
        </div>

        <div className="header-btn">
          <Button type="primary">ADMIN PORTAL</Button>
        </div>
      </Header>
      
      <Content className="signin" style={{ backgroundColor: "#ffffff", flex: 1, display: 'flex', alignItems: 'center' }}>
        <Row gutter={[24, 0]} justify="space-around" align="middle" style={{ width: '100%', margin: 0 }}>
          <Col
            xs={{ span: 24 }}
            lg={{ span: 6, offset: 2 }}
            md={{ span: 12 }}
            style={{ padding: "20px" }}
          >
            <Title className="mb-15">Sign In</Title>
            <Title className="font-regular text-muted" level={5} style={{ color: "#8c8c8c", marginBottom: "30px" }}>
              Enter your email and password to sign in
            </Title>
            
            <Form
              form={form}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              layout="vertical"
              className="row-col"
              initialValues={{ remember: false }}
            >
              <Form.Item
                className="username"
                label="Email"
                name="email"
                rules={[{ required: true, message: "Input email!", type: "email" }]}
              >
                <Input placeholder="Email" size="large" />
              </Form.Item>

              <Form.Item
                className="username"
                label="Password"
                name="password"
                rules={[{ required: true, message: "Input password!" }]}
              >
                <Input.Password placeholder="Password" size="large" />
              </Form.Item>

              <Form.Item style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                  <span style={{ marginLeft: "10px", color: "#8c8c8c" }}>Remember me</span>
                </div>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: "100%" }} loading={loading} size="large">
                  SIGN IN
                </Button>
              </Form.Item>
            </Form>
          </Col>
          
          <Col
            className="sign-img"
            style={{ padding: 12 }}
            xs={{ span: 24 }}
            lg={{ span: 12 }}
            md={{ span: 12 }}
          >
            <img 
              src={signinbg} 
              alt="Background" 
              style={{ width: '100%', borderRadius: 12, maxHeight: '80vh', objectFit: 'contain' }} 
            />
          </Col>
        </Row>
      </Content>
      
      <Footer style={{ background: "#ffffff", color: "#8c8c8c", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 50px" }}>
        <p className="copyright" style={{ margin: "0" }}>
          Copyright © {new Date().getFullYear()} Montreal Intl | Designed by{" "}
          <a href="#" style={{ color: "#8c8c8c", fontWeight: "bold" }} target="_blank" rel="noreferrer">
            Designity
          </a>
        </p>
        
        <Menu 
          mode="horizontal" 
          items={footerSocialItems}
          style={{ background: "transparent", border: "none", lineHeight: "1.5", width: "150px", justifyContent: "end" }} 
        />
      </Footer>
    </Layout>
  );
};

export default LoginPage;