import { Empty, Typography } from 'antd';

const { Title, Text } = Typography;

/**
 * 按钮管理页面 - 占位页面
 * TODO: 实现按钮管理功能
 */
export function ButtonManagementPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <div className="text-center">
            <Title level={4}>按钮管理</Title>
            <Text type="secondary">功能开发中，敬请期待...</Text>
          </div>
        }
      />
    </div>
  );
}

export default ButtonManagementPage;