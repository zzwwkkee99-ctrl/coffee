import { useState } from 'react';
import { Card, Input, Button, Descriptions, Tag, InputNumber, message, Typography, Result, Space, Table, Alert } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;

interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
}

interface CardInfo {
  id: number;
  card_no: string;
  type: string;
  balance: number;
  remaining_count: number;
  total_value: number;
  total_count: number;
  status: string;
  memo: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: '使用中' },
  exhausted: { color: 'orange', text: '已用尽' },
  disabled: { color: 'red', text: '已禁用' },
};

export default function CardRecharge() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardInfo | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [recharged, setRecharged] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim() || !/^1\d{10}$/.test(phone.trim())) {
      message.warning('请输入有效的手机号');
      return;
    }
    setLoading(true);
    setSelectedCard(null);
    setRecharged(false);
    try {
      const res: any = await api.get(`/admin/cards/by-phone/${phone.trim()}`);
      setCustomer(res.data.customer);
      setCards(res.data.cards);
      if (res.data.cards.length === 0) {
        message.info('该客户暂无卡片');
      }
    } catch (err: any) {
      message.error(err?.message || '查询失败');
      setCustomer(null);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!selectedCard) return;
    setLoading(true);
    try {
      const body: any = { note };
      if (selectedCard.type === 'value') {
        if (!amount || amount <= 0) { message.warning('请输入充值金额'); setLoading(false); return; }
        body.amount = amount;
      } else {
        if (!count || count <= 0) { message.warning('请输入充值次数'); setLoading(false); return; }
        body.count = count;
      }
      await api.post(`/admin/cards/${selectedCard.id}/recharge`, body);
      message.success('充值成功');
      setRecharged(true);
    } catch (err: any) {
      message.error(err?.message || '充值失败');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhone('');
    setCustomer(null);
    setCards([]);
    setSelectedCard(null);
    setRecharged(false);
    setAmount(null);
    setCount(null);
    setNote('');
  };

  if (recharged) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="充值成功"
        extra={<Button type="primary" onClick={reset}>继续充值</Button>}
      />
    );
  }

  const cardColumns = [
    { title: '卡号', dataIndex: 'card_no', key: 'card_no', width: 160 },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'value' ? 'blue' : 'purple'}>{v === 'value' ? '储值卡' : '次卡'}</Tag>,
    },
    {
      title: '余额/次数', key: 'balance',
      render: (_: any, r: CardInfo) => r.type === 'value' ? `¥${r.balance}` : `${r.remaining_count}/${r.total_count}次`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const s = statusMap[v] || { color: 'default', text: v };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: CardInfo) => (
        <Button type="link" onClick={() => setSelectedCard(r)}>选择充值</Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <Title level={4}>充值</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="输入客户手机号搜索"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            maxLength={11}
          />
          <Button size="large" type="primary" onClick={handleSearch} loading={loading}>
            搜索
          </Button>
        </Space.Compact>
      </Card>

      {customer && (
        <Card title="客户信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{customer.phone}</Descriptions.Item>
          </Descriptions>

          {cards.length > 0 ? (
            <>
              <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>选择要充值的卡</Title>
              <Table
                dataSource={cards}
                columns={cardColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </>
          ) : (
            <Alert type="info" message="该客户暂无卡片" style={{ marginTop: 16 }} />
          )}
        </Card>
      )}

      {selectedCard && (
        <Card title={`充值 - ${selectedCard.card_no}`}>
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="卡号">{selectedCard.card_no}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag color={selectedCard.type === 'value' ? 'blue' : 'purple'}>
                {selectedCard.type === 'value' ? '储值卡' : '次卡'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="当前余额/次数">
              {selectedCard.type === 'value' ? `¥${selectedCard.balance}` : `${selectedCard.remaining_count}/${selectedCard.total_count}次`}
            </Descriptions.Item>
          </Descriptions>

          {selectedCard.type === 'value' ? (
            <InputNumber
              size="large"
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="充值金额"
              min={1}
              value={amount}
              onChange={(v) => setAmount(v)}
              prefix="¥"
            />
          ) : (
            <InputNumber
              size="large"
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="充值次数"
              min={1}
              value={count}
              onChange={(v) => setCount(v)}
              addonAfter="次"
            />
          )}
          <Input
            placeholder="备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <Space style={{ width: '100%' }}>
            <Button onClick={() => setSelectedCard(null)}>取消</Button>
            <Button type="primary" size="large" onClick={handleRecharge} loading={loading}>
              确认充值
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
}
