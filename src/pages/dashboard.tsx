import { BarChartOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Flex, Statistic, Tag, Typography, theme as antdTheme } from 'antd';
import { PageContainer } from '@/components/page-container';

const dashboardStats = [
  { title: 'Active Sessions', value: 128, icon: <TeamOutlined /> },
  { title: 'Healthy Services', value: 24, icon: <CheckCircleOutlined /> },
  { title: 'Daily Events', value: 4820, icon: <BarChartOutlined /> },
];

export function DashboardPage() {
  const { token } = antdTheme.useToken();

  return (
    <PageContainer>
      <Flex vertical gap={token.marginLG}>
        <Flex align="center" justify="space-between" gap={token.marginMD} wrap="wrap">
          <div>
            <Typography.Title level={3} style={{ marginBlock: 0 }}>
              Operations Overview
            </Typography.Title>
            <Typography.Text type="secondary">Core business workspace for Nebula Web.</Typography.Text>
          </div>
          <Tag color="processing">Live</Tag>
        </Flex>

        <Flex gap={token.marginLG} wrap="wrap">
          {dashboardStats.map((item) => (
            <Flex
              key={item.title}
              vertical
              gap={token.marginSM}
              style={{
                flex: '1 1 180px',
                minWidth: 180,
                padding: token.paddingLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillQuaternary,
              }}
            >
              <Flex align="center" gap={token.marginSM} style={{ color: token.colorPrimary }}>
                {item.icon}
                <Typography.Text type="secondary">{item.title}</Typography.Text>
              </Flex>
              <Statistic value={item.value} />
            </Flex>
          ))}
        </Flex>
      </Flex>
    </PageContainer>
  );
}

export default DashboardPage;
