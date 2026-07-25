import { Empty, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * 通用配置页面 - 占位页面
 * TODO: 实现通用配置功能
 */
export function GeneralConfigPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <div className="text-center">
            <Title level={4}>通用配置</Title>
            <Text type="secondary">功能开发中，敬请期待...</Text>
          </div>
        }
      />
    </div>
  );
}

export default GeneralConfigPage;