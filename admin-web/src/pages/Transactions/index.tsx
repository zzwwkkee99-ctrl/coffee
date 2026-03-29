import { useEffect, useState } from 'react';
import { Table, DatePicker, Tag, message, Typography, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface Transaction {
  id: number;
  card_no: string;
  card_type: string;
  customer_name: string;
  customer_phone: string;
  operator_name: string;
  type: string;
  amount: number | null;
  count: number | null;
  balance_after: number | null;
  count_after: number | null;
  note: string;
  is_undone?: boolean;
  created_at: string;
}

const typeMap: Record<string, { color: string; text: string }> = {
  issue: { color: 'blue', text: '开卡' },
  consume: { color: 'orange', text: '消费' },
  recharge: { color: 'green', text: '充值' },
  undo: { color: 'purple', text: '撤销' },
};

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = async (p = page, dates = dateRange) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize: 20 };
      if (dates) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }
      const res: any = await api.get('/admin/transactions', { params });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      const token = localStorage.getItem('admin_token');
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/admin/transactions/export${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `交易记录_${new Date().toLocaleDateString('zh-CN')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      message.success('导出成功');
    } catch (err: any) {
      message.error(err?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleUndo = async (id: number) => {
    if (!window.confirm('确定要撤销这条核销记录吗？撤销后将回退对应的余额/次数。')) return;
    try {
      await api.post(`/admin/transactions/${id}/undo`);
      message.success('撤销成功');
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '撤销失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '卡号', dataIndex: 'card_no', key: 'card_no', width: 180 },
    { title: '客户', dataIndex: 'customer_name', key: 'customer_name' },
    { title: '手机号', dataIndex: 'customer_phone', key: 'customer_phone' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => {
        const t = typeMap[v] || { color: 'default', text: v };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: '金额/次数', key: 'value',
      render: (_: any, r: Transaction) => {
        if (r.amount !== null && r.amount !== undefined) return `¥${r.amount}`;
        if (r.count !== null && r.count !== undefined) return `${r.count}次`;
        return '-';
      },
    },
    {
      title: '余额/次数(后)', key: 'after',
      render: (_: any, r: Transaction) => {
        if (r.balance_after !== null && r.balance_after !== undefined) return `¥${r.balance_after}`;
        if (r.count_after !== null && r.count_after !== undefined) return `${r.count_after}次`;
        return '-';
      },
    },
    { title: '操作人', dataIndex: 'operator_name', key: 'operator_name' },
    { title: '备注', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, r: Transaction) => {
        if (r.type === 'consume' && !r.is_undone) {
          return <Button size="small" type="link" danger onClick={() => handleUndo(r.id)}>撤销</Button>;
        }
        return null;
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>交易记录</Title>
        <Space>
          <RangePicker
            onChange={(dates) => {
              if (dates) {
                const range: [string, string] = [
                  dates[0]!.startOf('day').toISOString(),
                  dates[1]!.endOf('day').toISOString(),
                ];
                setDateRange(range);
                setPage(1);
                fetchData(1, range);
              } else {
                setDateRange(null);
                setPage(1);
                fetchData(1, null);
              }
            }}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            导出 CSV
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
    </div>
  );
}
