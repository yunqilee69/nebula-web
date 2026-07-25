import { Empty, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * 审计日志页面 - 占位页面
 * TODO: 实现审计日志功能
 */
export function AuditLogPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <div className="text-center">
            <Title level={4}>审计日志</Title>
            <Text type="secondary">功能开发中，敬请期待...</Text>
          </div>
        }
      />
    </div>
  );
}

export default AuditLogPage;