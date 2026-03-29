import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Typography, Space, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, KeyOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

interface Customer {
  id: number;
  phone: string;
  name: string;
  created_at: string;
}

export default function Customers() {
  const [data, setData] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async (p = page, s = search) => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/customers', { params: { page: p, pageSize: 20, search: s } });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (values: any) => {
    try {
      await api.post('/admin/customers', values);
      message.success('创建成功（默认密码为手机号）');
      setModalOpen(false);
      form.resetFields();
      fetchData(1);
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    }
  };

  const handleResetPassword = async (id: number) => {
    try {
      await api.post(`/admin/customers/${id}/reset-password`);
      message.success('密码已重置为手机号');
    } catch (err: any) {
      message.error(err?.message || '重置失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData(1, search);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '注册时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: any, record: Customer) => (
        <Popconfirm
          title="确认重置密码？"
          description={`将重置为手机号：${record.phone}`}
          onConfirm={() => handleResetPassword(record.id)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="link" icon={<KeyOutlined />} size="small">
            重置密码
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>客户管理</Title>
        <Space>
          <Input
            placeholder="搜索手机号或姓名"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            suffix={<SearchOutlined onClick={handleSearch} style={{ cursor: 'pointer' }} />}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新增客户
          </Button>
        </Space>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => { setPage(p); fetchData(p); },
        }}
      />

      <Modal title="新增客户" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '请输入有效的手机号' },
          ]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>
              💡 默认密码与手机号一致，客户可自行在 H5 端修改
            </p>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
