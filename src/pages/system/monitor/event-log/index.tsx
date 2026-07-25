import { Empty, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * 事件记录页面 - 占位页面
 * TODO: 实现事件记录功能
 */
export function EventLogPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <div className="text-center">
            <Title level={4}>事件记录</Title>
            <Text type="secondary">功能开发中，敬请期待...</Text>
          </div>
        }
      />
    </div>
  );
}

export default EventLogPage;