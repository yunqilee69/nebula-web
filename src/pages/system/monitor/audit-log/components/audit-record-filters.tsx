import { Button, Col, Form, Input, Row, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useCallback } from 'react';
import type { AuditCategory } from '@/types/audit';

export interface AuditRecordFilterValues {
  module?: string;
  action?: string;
  category?: AuditCategory | '';
  operatorId?: string;
  resource?: string;
  resourceId?: string;
  success?: boolean | '';
  bizNo?: string;
  traceId?: string;
}

interface AuditRecordFiltersProps {
  readonly form: FormInstance<AuditRecordFilterValues>;
  readonly onSearch: (values: AuditRecordFilterValues) => void;
  readonly onReset: () => void;
}

export function AuditRecordFilters({ form, onSearch, onReset }: AuditRecordFiltersProps) {
  const handleSubmit = useCallback(() => {
    const values = form.getFieldsValue();
    onSearch(values);
  }, [form, onSearch]);

  const handleReset = useCallback(() => {
    form.resetFields();
    onReset();
  }, [form, onReset]);

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="module" label="模块">
            <Input placeholder="请输入模块名称" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="action" label="操作">
            <Input placeholder="请输入操作类型" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="category" label="审计分类">
            <Select placeholder="请选择审计分类" allowClear>
              <Select.Option value="BUSINESS">业务操作</Select.Option>
              <Select.Option value="SECURITY">安全审计</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="operatorId" label="操作人ID">
            <Input placeholder="请输入操作人ID" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="resource" label="资源类型">
            <Input placeholder="请输入资源类型" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="resourceId" label="资源ID">
            <Input placeholder="请输入资源ID" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="success" label="执行状态">
            <Select placeholder="请选择执行状态" allowClear>
              <Select.Option value={true}>成功</Select.Option>
              <Select.Option value={false}>失败</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="bizNo" label="业务编号">
            <Input placeholder="请输入业务编号" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="traceId" label="链路追踪ID">
            <Input placeholder="请输入链路追踪ID" allowClear />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item label=" ">
            <Row gutter={8}>
              <Col>
                <Button type="primary" htmlType="submit">
                  查询
                </Button>
              </Col>
              <Col>
                <Button onClick={handleReset}>重置</Button>
              </Col>
            </Row>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}