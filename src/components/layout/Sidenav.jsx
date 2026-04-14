import { useMemo } from "react";
import { Menu } from "antd";
import { NavLink, useLocation } from "react-router-dom";
import {
  HomeOutlined, UserOutlined, CalendarOutlined, ProfileOutlined,
  MessageOutlined, ProjectOutlined, SafetyCertificateOutlined,
  DatabaseOutlined, GoldOutlined, DollarOutlined,
  CarOutlined,
  PieChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";

function Sidenav({ color }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const items = useMemo(() => {
    const rawMenuItems = [
      { path: "/dashboard", name: "Dashboard", icon: <HomeOutlined />, perm: null },
      // My Attendance is shown prominently for Site Managers
      ...(user?.role === 'Site Manager' ? [{ path: "/my-attendance", name: "My Attendance", icon: <ClockCircleOutlined />, perm: null }] : []),
      // Phase 6: New pages (admin only)
      { path: "/overview", name: "Overview", icon: <BarChartOutlined />, perm: 'admin:view_all' },
      { path: "/workforce-allocation", name: "Workforce Alloc.", icon: <UsergroupAddOutlined />, perm: 'admin:view_all' },
      { path: "/analytics", name: "Analytics", icon: <PieChartOutlined />, perm: 'admin:view_all' },
      { path: "/employees", name: "Employees", icon: <UserOutlined />, perm: null },
      { path: "/managers", name: "Managers", icon: <TeamOutlined />, perm: 'admin:view_all' },
      { path: "/manager-attendance", name: "Manager Attendance", icon: <CalendarOutlined />, perm: 'admin:view_all' },
      { path: "/vehicles", name: "Vehicles", icon: <CarOutlined />, perm: null },
      { path: "/attendance", name: "Attendance", icon: <CalendarOutlined />, perm: 'attendance:update' },
      { path: "/duty-list", name: "Duty List", icon: <ProfileOutlined />, perm: 'schedule:edit' },
      { path: "/payslips", name: "Payslips", icon: <DollarOutlined />, perm: 'payslip:generate' },
      { path: "/inventory", name: "Inventory", icon: <DatabaseOutlined />, perm: 'employee:view_all' },
      { path: "/projects", name: "Projects", icon: <ProjectOutlined />, perm: 'employee:view_all' },
      { path: "/project-workflow", name: "Project Workflow", icon: <ApartmentOutlined />, perm: 'admin:view_all' },
      { path: "/workflow", name: "Workflow Overview", icon: <ApartmentOutlined />, perm: 'admin:view_all' },
      
      // --- RESTRICTED FINANCE ITEM (ADMIN ONLY) ---
      { 
        path: "/finance", 
        name: "Finance (P&L)", 
        icon: <PieChartOutlined />, 
        perm: 'admin:view_all' // Managers do not have this permission
      },
      
      {
        path: user?.role === 'Site Manager' ? "/manager-messages" : "/messages",
        name: user?.role === 'Site Manager' ? "My Messages" : "Messages",
        icon: <MessageOutlined />,
        perm: null,
      },
      { path: "/admins", name: "Admins", icon: <SafetyCertificateOutlined />, perm: 'admin:view_all' },
      { path: "/site-management", name: "Site Mgmt", icon: <GoldOutlined />, perm: 'admin:view_all' },
      { path: "/my-profile", name: "My Profile", icon: <ContactsOutlined />, perm: null },
      { path: "/settings", name: "Settings", icon: <SettingOutlined />, perm: 'admin:view_all' },
    ];

    const visibleItems = rawMenuItems.filter(item => 
      !item.perm || (user?.perms && user.perms.includes(item.perm))
    );

    return visibleItems.map((item) => ({
      key: item.path,
      label: (
        <NavLink to={item.path} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
          <span className="icon" style={{
              background: pathname === item.path ? color : "#fff",
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              minWidth: '32px', height: '32px', borderRadius: '8px',
              color: pathname === item.path ? "#fff" : color,
              boxShadow: pathname === item.path ? "0 4px 6px rgba(0,0,0,0.12)" : "0 2px 4px rgba(0,0,0,0.05)",
            }}>
            {item.icon}
          </span>
          <span className="label" style={{ fontWeight: pathname === item.path ? 600 : 500 }}>{item.name}</span>
        </NavLink>
      ),
    }));
  }, [user, pathname, color]);

  return (
    <>
      <div className="brand" style={{ padding: '20px', fontSize: '18px', fontWeight: 800 }}>Montreal Intl.</div>
      <hr style={{ margin: '0 20px 15px', border: '0', borderTop: '1px solid #f0f0f0' }} />
      <Menu 
        theme="light" 
        mode="inline" 
        selectedKeys={[pathname]} 
        items={items} 
        style={{ borderRight: 0, background: 'transparent' }} 
      />
    </>
  );
}

export default Sidenav;