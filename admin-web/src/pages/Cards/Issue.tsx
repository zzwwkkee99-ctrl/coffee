import { useState, useEffect } from 'react';
import { Form, Select, Input, Button, Card, message, Typography, Descriptions, Tag, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;
const { TextArea } = Input;

interface Template {
  id: number;
  name: string;
  type: string;
  amount: number | null;
  count: number | null;
}

export default function CardIssue() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [existingCards, setExistingCards] = useState<any[] | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/card-templates').then((res: any) => {
      setTemplates(res.data);
    }).catch(() => message.error('加载模板失败'));
  }, []);

  const handlePhoneBlur = async () => {
    const phone = form.getFieldValue('phone');
    if (!phone || !/^1\d{10}$/.test(phone)) {
      setPhoneChecked(false);
      setCustomerInfo(null);
      setExistingCards(null);
      return;
    }
    try {
      const res: any = await api.get(`/admin/cards/by-phone/${phone}`);
      setCustomerInfo(res.data.customer);
      setExistingCards(res.data.cards);
      setPhoneChecked(true);
      // Auto-fill name if customer exists
      if (res.data.customer?.name) {
        form.setFieldValue('name', res.data.customer.name);
      }
    } catch {
      // Customer doesn't exist yet
      setCustomerInfo(null);
      setExistingCards(null);
      setPhoneChecked(true);
    }
  };

  const handleTemplateChange = (templateId: number) => {
    const tpl = templates.find(t => t.id === templateId);
    setSelectedTemplate(tpl || null);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await api.post('/admin/cards', {
        phone: values.phone,
        name: values.name,
        templateId: values.templateId,
        memo: values.memo,
      });
      message.success('操作成功');
      navigate('/cards');
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const hasSameTemplate = existingCards?.some(c =>
    selectedTemplate && c.template_id === selectedTemplate.id && ['active', 'exhausted'].includes(c.status)
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4}>开卡 / 充值</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="phone"
            label="客户手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1\d{10}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input
              placeholder="输入客户手机号"
              maxLength={11}
              onBlur={handlePhoneBlur}
              onChange={() => { setPhoneChecked(false); setCustomerInfo(null); setExistingCards(null); }}
            />
          </Form.Item>

          {phoneChecked && customerInfo && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`已有客户：${customerInfo.name}（${customerInfo.phone}）`}
              description={existingCards && existingCards.length > 0
                ? `已有 ${existingCards.length} 张卡`
                : '暂无卡片'
              }
            />
          )}

          {phoneChecked && !customerInfo && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="新客户，将自动创建账号（密码默认为手机号）"
            />
          )}

          <Form.Item
            name="name"
            label="客户姓名"
            rules={[{ required: !customerInfo, message: '新客户请输入姓名' }]}
          >
            <Input placeholder="客户姓名" disabled={!!customerInfo} />
          </Form.Item>

          <Form.Item name="templateId" label="选择卡片" rules={[{ required: true, message: '请选择卡片模板' }]}>
            <Select
              placeholder="选择卡片模板"
              onChange={handleTemplateChange}
              options={templates.map(t => ({
                value: t.id,
                label: `${t.name}（${t.type === 'value' ? `¥${t.amount}` : `${t.count}次`}）`,
              }))}
            />
          </Form.Item>

          {selectedTemplate && (
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="类型">
                <Tag color={selectedTemplate.type === 'value' ? 'blue' : 'purple'}>
                  {selectedTemplate.type === 'value' ? '储值卡' : '次卡'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={selectedTemplate.type === 'value' ? '金额' : '次数'}>
                {selectedTemplate.type === 'value' ? `¥${selectedTemplate.amount}` : `${selectedTemplate.count}次`}
              </Descriptions.Item>
            </Descriptions>
          )}

          {hasSameTemplate && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message="该客户已有同类卡，将自动在已有卡上充值"
            />
          )}

          <Form.Item name="memo" label="备注">
            <TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              {hasSameTemplate ? '确认充值' : '确认开卡'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
