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
  template_name: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: '使用中' },
  exhausted: { color: 'orange', text: '已用尽' },
  disabled: { color: 'red', text: '已禁用' },
};

export default function CardVerify() {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [cards, setCards] = useState<CardInfo[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardInfo | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [count, setCount] = useState<number>(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const [consumeDetail, setConsumeDetail] = useState('');

  const handleSearch = async () => {
    if (!phone.trim() || !/^1\d{10}$/.test(phone.trim())) {
      message.warning('请输入有效的手机号');
      return;
    }
    setLoading(true);
    setSelectedCard(null);
    setConsumed(false);
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

  const handleConsume = async () => {
    if (!selectedCard) return;

    // Validate before submitting
    if (selectedCard.type === 'count') {
      if (!Number.isInteger(count) || count <= 0) {
        message.warning('请输入正整数的消费次数');
        return;
      }
      if (count > selectedCard.remaining_count) {
        message.warning(`消费次数不能超过剩余次数 (${selectedCard.remaining_count}次)`);
        return;
      }
    } else {
      if (!amount || amount <= 0) {
        message.warning('请输入大于0的消费金额');
        return;
      }
      if (amount > selectedCard.balance) {
        message.warning(`消费金额不能超过余额 (¥${selectedCard.balance})`);
        return;
      }
    }

    setLoading(true);
    try {
      const body: any = { note };
      if (selectedCard.type === 'value') {
        body.amount = amount;
      } else {
        body.count = count;
      }
      await api.post(`/admin/cards/${selectedCard.id}/consume`, body);
      const detail = selectedCard.type === 'value'
        ? `${customer?.name} (${customer?.phone}) - 消费 ¥${amount}`
        : `${customer?.name} (${customer?.phone}) - 消费 ${count}次`;
      setConsumeDetail(detail);
      setConsumed(true);
    } catch (err: any) {
      message.error(err?.message || '核销失败');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhone('');
    setCustomer(null);
    setCards([]);
    setSelectedCard(null);
    setConsumed(false);
    setAmount(null);
    setCount(1);
    setNote('');
  };

  if (consumed) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 72 }} />}
        title="核销成功"
        subTitle={consumeDetail}
        extra={
          <Button type="primary" size="large" onClick={reset}>继续核销</Button>
        }
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
    { title: '备注', dataIndex: 'memo', key: 'memo', ellipsis: true },
    {
      title: '操作', key: 'action',
      render: (_: any, r: CardInfo) => (
        r.status === 'active' ? (
          <Button type="link" onClick={() => setSelectedCard(r)}>选择此卡</Button>
        ) : (
          <span style={{ color: '#999' }}>不可用</span>
        )
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <Title level={4}>核销</Title>

      {/* Step 1: Search by phone */}
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

      {/* Step 2: Show customer info + card list */}
      {customer && (
        <Card title="客户信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{customer.phone}</Descriptions.Item>
          </Descriptions>

          {cards.length > 0 ? (
            <>
              <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>卡片列表（点击"选择此卡"进行核销）</Title>
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

      {/* Step 3: Consume selected card */}
      {selectedCard && (
        <Card title={`核销 - ${selectedCard.card_no}`}>
          <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="卡号">{selectedCard.card_no}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag color={selectedCard.type === 'value' ? 'blue' : 'purple'}>
                {selectedCard.type === 'value' ? '储值卡' : '次卡'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="余额/次数">
              {selectedCard.type === 'value' ? `¥${selectedCard.balance}` : `${selectedCard.remaining_count}/${selectedCard.total_count}次`}
            </Descriptions.Item>
          </Descriptions>

          {selectedCard.type === 'value' ? (
            <InputNumber
              size="large"
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="消费金额"
              min={0.01}
              max={selectedCard.balance}
              value={amount}
              onChange={(v) => setAmount(v)}
              prefix="¥"
            />
          ) : (
            <InputNumber
              size="large"
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="消费次数"
              min={1}
              max={selectedCard.remaining_count}
              precision={0}
              value={count}
              onChange={(v) => setCount(v || 1)}
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
            <Button type="primary" size="large" onClick={handleConsume} loading={loading}
              style={{ background: '#52c41a', borderColor: '#52c41a', flex: 1 }}>
              确认核销
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
}
