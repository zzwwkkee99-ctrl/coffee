import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { CoffeeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const { Title } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await api.post('/auth/admin/login', values);
      setAuth(res.data.token, res.data.user);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CoffeeOutlined style={{ fontSize: 48, color: '#764ba2' }} />
          <Title level={3} style={{ marginTop: 8, color: '#333' }}>咖啡卡管理系统</Title>
        </div>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input size="large" placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password size="large" placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', height: 48 }}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
