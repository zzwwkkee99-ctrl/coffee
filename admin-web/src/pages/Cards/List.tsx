import { useEffect, useState } from 'react';
import { Table, Tag, Select, message, Typography, Space, Tabs, Button, Modal, Form, Input, InputNumber } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

interface Card {
  id: number;
  card_no: string;
  customer_name: string;
  customer_phone: string;
  type: string;
  balance: number;
  remaining_count: number;
  total_value: number;
  total_count: number;
  status: string;
  memo: string;
  template_name: string;
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  type: string;
  amount: number | null;
  count: number | null;
  status: string;
  created_at: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: '使用中' },
  exhausted: { color: 'orange', text: '已用尽' },
  disabled: { color: 'red', text: '已禁用' },
};

export default function CardList() {
  const [data, setData] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ type?: string; status?: string }>({});
  const [loading, setLoading] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplForm] = Form.useForm();
  const tplType = Form.useWatch('type', tplForm);

  const fetchData = async (p = page, f = filters) => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/cards', { params: { page: p, pageSize: 20, ...f } });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTplLoading(true);
    try {
      const res: any = await api.get('/admin/card-templates', { params: { includeDisabled: 'true' } });
      setTemplates(res.data);
    } catch (err: any) {
      message.error(err?.message || '加载模板失败');
    } finally {
      setTplLoading(false);
    }
  };

  useEffect(() => { fetchData(); fetchTemplates(); }, []);

  const handleCreateTemplate = async (values: any) => {
    try {
      await api.post('/admin/card-templates', values);
      message.success('模板创建成功');
      setTplModalOpen(false);
      tplForm.resetFields();
      fetchTemplates();
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    }
  };

  const handleToggleTemplateStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await api.patch(`/admin/card-templates/${id}/status`, { status: newStatus });
      message.success(newStatus === 'active' ? '已启用' : '已禁用');
      fetchTemplates();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  const cardColumns = [
    { title: '卡号', dataIndex: 'card_no', key: 'card_no', width: 180 },
    { title: '客户', dataIndex: 'customer_name', key: 'customer_name' },
    { title: '手机号', dataIndex: 'customer_phone', key: 'customer_phone' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'value' ? 'blue' : 'purple'}>{v === 'value' ? '储值卡' : '次卡'}</Tag>,
    },
    {
      title: '余额/次数', key: 'balance',
      render: (_: any, r: Card) => r.type === 'value' ? `¥${r.balance}` : `${r.remaining_count}/${r.total_count}次`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const s = statusMap[v] || { color: 'default', text: v };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '模板', dataIndex: 'template_name', key: 'template_name', render: (v: string) => v || '-' },
    { title: '备注', dataIndex: 'memo', key: 'memo', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
  ];

  const templateColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '模板名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'value' ? 'blue' : 'purple'}>{v === 'value' ? '储值卡' : '次卡'}</Tag>,
    },
    {
      title: '金额/次数', key: 'value',
      render: (_: any, r: Template) => r.type === 'value' ? `¥${r.amount}` : `${r.count}次`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '启用' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作', key: 'action',
      render: (_: any, r: Template) => (
        <Button
          type="link"
          danger={r.status === 'active'}
          onClick={() => handleToggleTemplateStatus(r.id, r.status)}
        >
          {r.status === 'active' ? '禁用' : '启用'}
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'cards',
      label: '已发卡列表',
      children: (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Space>
              <Select
                placeholder="卡类型"
                allowClear
                style={{ width: 120 }}
                onChange={(v) => { const f = { ...filters, type: v }; setFilters(f); setPage(1); fetchData(1, f); }}
                options={[
                  { value: 'value', label: '储值卡' },
                  { value: 'count', label: '次卡' },
                ]}
              />
              <Select
                placeholder="状态"
                allowClear
                style={{ width: 120 }}
                onChange={(v) => { const f = { ...filters, status: v }; setFilters(f); setPage(1); fetchData(1, f); }}
                options={[
                  { value: 'active', label: '使用中' },
                  { value: 'exhausted', label: '已用尽' },
                  { value: 'disabled', label: '已禁用' },
                ]}
              />
            </Space>
          </div>
          <Table
            dataSource={data}
            columns={cardColumns}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              total,
              pageSize: 20,
              onChange: (p) => { setPage(p); fetchData(p); },
            }}
          />
        </>
      ),
    },
    {
      key: 'templates',
      label: '卡片模板管理',
      children: (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTplModalOpen(true)}>
              新增模板
            </Button>
          </div>
          <Table
            dataSource={templates}
            columns={templateColumns}
            rowKey="id"
            loading={tplLoading}
            pagination={false}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>卡片管理</Title>
      <Tabs items={tabItems} onChange={(key) => {
        if (key === 'templates') fetchTemplates();
        else fetchData();
      }} />

      <Modal title="新增卡片模板" open={tplModalOpen} onCancel={() => setTplModalOpen(false)} footer={null}>
        <Form form={tplForm} layout="vertical" onFinish={handleCreateTemplate}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="如：10次咖啡卡、500元储值卡" />
          </Form.Item>
          <Form.Item name="type" label="卡类型" rules={[{ required: true, message: '请选择卡类型' }]}>
            <Select options={[
              { value: 'value', label: '储值卡' },
              { value: 'count', label: '次卡' },
            ]} />
          </Form.Item>
          {tplType === 'value' && (
            <Form.Item name="amount" label="面值金额" rules={[{ required: true, message: '请输入金额' }]}>
              <InputNumber min={1} style={{ width: '100%' }} prefix="¥" />
            </Form.Item>
          )}
          {tplType === 'count' && (
            <Form.Item name="count" label="次数" rules={[{ required: true, message: '请输入次数' }]}>
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="次" />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建模板</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
