import React from "react";
import {
  BiBookAlt, 
  BiHome, 
  BiMessage,
  BiStats, 
  BiTask,
  BiCalendarCheck, 
  BiClipboard,
  BiUser,
  BiCar,
  BiSitemap,
  BiLineChart, // <--- 1. NEW ICON FOR FINANCE
  BiReceipt     // <--- ICON FOR BILLING/INVOICES
} from "react-icons/bi";
import { FaUserShield } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import "../styles/sidebar.css";

// 2. DEFINE THE MENU ITEMS
const allMenuItems = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: <BiHome className="icon" />,
    requiredPerm: null,
  },
  {
    path: "/employees", 
    name: "Employees",
    icon: <BiUser className="icon" />,
    requiredPerm: null, 
  },
  {
    path: "/vehicles",
    name: "Vehicles",
    icon: <BiCar className="icon" />,
    requiredPerm: null,
  },
  {
    path: "/attendance",
    name: "Attendance",
    icon: <BiCalendarCheck className="icon" />,
    requiredPerm: 'attendance:update', 
  },
  {
    path: "/duty-list",
    name: "Duty List",
    icon: <BiClipboard className="icon" />,
    requiredPerm: 'schedule:edit', 
  },
  {
    path: "/payslips",
    name: "Payslips",
    icon: <BiReceipt className="icon" />, 
    requiredPerm: 'payslip:view_all',
  },
  {
    path: "/inventory",
    name: "Inventory",
    icon: <BiTask className="icon" />,
    requiredPerm: 'employee:view_all', 
  },
  {
    path: "/projects",
    name: "Projects",
    icon: <BiStats className="icon" />,
    requiredPerm: 'employee:view_all',
  },
  // --- NEW FINANCE (P&L) LINK ---
  {
    path: "/finance",
    name: "Finance (P&L)",
    icon: <BiLineChart className="icon" />, // Professional Chart Icon
    requiredPerm: null, // Visible for testing; change to 'admin:view_all' later if needed
  },
  // -----------------------------
  {
    path: "/messages",
    name: "Messages",
    icon: <BiMessage className="icon" />,
    requiredPerm: 'employee:view_all',
  },
  {
    path: "/admins",
    name: "Admins",
    icon: <FaUserShield className="icon" />,
    requiredPerm: 'admin:view_all', 
  },
  {
    path: "/site-management",
    name: "Site Mgmt",
    icon: <BiSitemap className="icon" />,
    requiredPerm: 'site:view', 
  },
];

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Filter items based on permissions
  const visibleMenuItems = allMenuItems.filter(item => {
    return !item.requiredPerm || (user.perms && user.perms.includes(item.requiredPerm));
  });

  return (
    <div className="menu">
      <div className="logo">
        <BiBookAlt className="logo-icon" />
        <h2>
          Montreal <br /> International
        </h2>
      </div>

      <div className="menu--list">
        {visibleMenuItems.map((item, index) => (
          <NavLink
            to={item.path}
            key={index}
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;