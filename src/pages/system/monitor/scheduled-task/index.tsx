import { Empty, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * 定时任务页面 - 占位页面
 * TODO: 实现定时任务功能
 */
export function ScheduledTaskPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <div className="text-center">
            <Title level={4}>定时任务</Title>
            <Text type="secondary">功能开发中，敬请期待...</Text>
          </div>
        }
      />
    </div>
  );
}

export default ScheduledTaskPage;