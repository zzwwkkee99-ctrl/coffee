import { Layout as AntLayout, Menu, Typography, Avatar, Dropdown } from 'antd';
import {
  CoffeeOutlined,
  TeamOutlined,
  UserOutlined,
  CreditCardOutlined,
  PlusCircleOutlined,
  ScanOutlined,
  DollarOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Sider, Content, Header } = AntLayout;
const { Text } = Typography;

const menuItems = [
  { key: '/cards', icon: <CreditCardOutlined />, label: '卡片列表' },
  { key: '/cards/issue', icon: <PlusCircleOutlined />, label: '开卡' },
  { key: '/cards/verify', icon: <ScanOutlined />, label: '核销' },
  { key: '/cards/recharge', icon: <DollarOutlined />, label: '充值' },
  { key: '/customers', icon: <UserOutlined />, label: '客户管理' },
  { key: '/staff', icon: <TeamOutlined />, label: '店员管理' },
  { key: '/transactions', icon: <FileTextOutlined />, label: '交易记录' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dropdownItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={220}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <CoffeeOutlined style={{ fontSize: 24, color: '#764ba2', marginRight: 8 }} />
          <Text strong style={{ fontSize: 16 }}>咖啡卡管理</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 8 }}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ background: '#764ba2' }} icon={<UserOutlined />} />
              <Text>{user?.name}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
