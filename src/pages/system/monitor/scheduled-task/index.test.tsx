import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Ref } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { SchedulerService } from '@/services/scheduler';
import type { SchedulerJobResp, SchedulerJobRunResp, SchedulerJobRunStatus, SchedulerPageResp, SchedulerTriggerSource } from '@/types/scheduler';
import type { JobRunActionType } from './components/job-run-action-modal';
import type { JobRunTableHandle } from './components/job-run-table';
import type { JobTableHandle } from './components/job-table';
import { ScheduledTaskPage } from './index';

interface MockJobTableProps {
  readonly onDetail: (record: SchedulerJobResp) => void;
  readonly onEdit: (record: SchedulerJobResp) => void;
  readonly onTrigger: (record: SchedulerJobResp) => void;
}

interface MockTriggerModalProps {
  readonly open: boolean;
  readonly onTriggered?: () => void;
}

interface MockRunTableProps {
  readonly onDetail: (record: SchedulerJobRunResp) => void;
  readonly onLogs: (record: SchedulerJobRunResp) => void;
  readonly onTerminate: (record: SchedulerJobRunResp) => void;
  readonly onRetry: (record: SchedulerJobRunResp) => void;
  readonly onRerun: (record: SchedulerJobRunResp) => void;
}

interface MockRunActionModalProps {
  readonly open: boolean;
  readonly actionType: JobRunActionType;
  readonly onSubmit: (reason?: string) => void;
}

const mockState = vi.hoisted(() => ({
  jobReload: vi.fn(() => Promise.resolve()),
  runReload: vi.fn(() => Promise.resolve()),
  jobRecord: { id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true } satisfies SchedulerJobResp,
  runRecord: { id: 'run-1', requestId: 'req-1', jobCode: 'demoJob', runStatus: 'RUNNING', triggerSource: 'MANUAL' } satisfies SchedulerJobRunResp,
}));

vi.mock('./components/job-table', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobTable: React.forwardRef(function JobTable(props: MockJobTableProps, ref: Ref<JobTableHandle>) {
      React.useImperativeHandle(ref, () => ({ reload: mockState.jobReload }));
      return React.createElement(
        'section',
        { 'aria-label': 'job-table' },
        React.createElement('button', { onClick: () => props.onDetail(mockState.jobRecord) }, 'open job detail'),
        React.createElement('button', { onClick: () => props.onEdit(mockState.jobRecord) }, 'open job edit'),
        React.createElement('button', { onClick: () => props.onTrigger(mockState.jobRecord) }, 'open job trigger'),
      );
    }),
  };
});

vi.mock('./components/trigger-job-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    TriggerJobModal: ({ open, onTriggered }: MockTriggerModalProps) => open
      ? React.createElement('button', { onClick: () => onTriggered?.() }, 'complete trigger')
      : null,
  };
});

vi.mock('./components/job-run-table', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunTable: React.forwardRef(function JobRunTable(props: MockRunTableProps, ref: Ref<JobRunTableHandle>) {
      React.useImperativeHandle(ref, () => ({ reload: mockState.runReload }));
      return React.createElement(
        'section',
        { 'aria-label': 'run-table' },
        React.createElement('button', { onClick: () => props.onDetail(mockState.runRecord) }, 'open run detail'),
        React.createElement('button', { onClick: () => props.onLogs(mockState.runRecord) }, 'open run logs'),
        React.createElement('button', { onClick: () => props.onTerminate(mockState.runRecord) }, 'open terminate'),
        React.createElement('button', { onClick: () => props.onRetry(mockState.runRecord) }, 'open retry'),
        React.createElement('button', { onClick: () => props.onRerun(mockState.runRecord) }, 'open rerun'),
      );
    }),
  };
});

vi.mock('./components/job-run-action-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunActionModal: ({ open, actionType, onSubmit }: MockRunActionModalProps) => open
      ? React.createElement('button', { onClick: () => onSubmit(' manual reason ') }, `submit ${actionType}`)
      : null,
  };
});

vi.mock('./components/job-form-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobFormModal: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'job form modal') : null,
  };
});

vi.mock('./components/job-detail-drawer', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobDetailDrawer: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'job detail drawer') : null,
  };
});

vi.mock('./components/job-run-detail-drawer', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunDetailDrawer: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'run detail drawer') : null,
  };
});

vi.mock('./components/job-run-log-modal', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    JobRunLogModal: ({ open }: { readonly open: boolean }) => open ? React.createElement('span', null, 'run log modal') : null,
  };
});

function createService(): SchedulerService {
  const emptyJobs: SchedulerPageResp<SchedulerJobResp> = { data: [], total: 0 };
  const emptyRuns: SchedulerPageResp<SchedulerJobRunResp> = { data: [], total: 0 };

  return {
    pageJobs: vi.fn().mockResolvedValue(emptyJobs),
    getJobDetail: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true }),
    updateJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true }),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    syncJobs: vi.fn().mockResolvedValue(0),
    triggerJob: vi.fn().mockResolvedValue({ requestId: 'req-1', jobCode: 'demoJob', runStatus: 'PENDING' satisfies SchedulerJobRunStatus, triggerSource: 'MANUAL' satisfies SchedulerTriggerSource }),
    enableJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: true }),
    disableJob: vi.fn().mockResolvedValue({ id: 'job-1', jobCode: 'demoJob', jobName: 'Demo Job', enabled: false }),
    pageJobRuns: vi.fn().mockResolvedValue(emptyRuns),
    getJobRunDetail: vi.fn().mockResolvedValue({ requestId: 'req-1', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'MANUAL' }),
    getJobRunLogs: vi.fn().mockResolvedValue({ requestId: 'req-1', content: '' }),
    terminateJobRun: vi.fn().mockResolvedValue(undefined),
    retryJobRun: vi.fn().mockResolvedValue({ requestId: 'req-2', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'RETRY' }),
    rerunJobRun: vi.fn().mockResolvedValue({ requestId: 'req-3', jobCode: 'demoJob', runStatus: 'PENDING', triggerSource: 'MANUAL' }),
  };
}

function renderPage(service = createService()) {
  render(
    <NebulaProvider>
      <ScheduledTaskPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

describe('ScheduledTaskPage', () => {
  beforeEach(() => {
    mockState.jobReload.mockClear();
    mockState.runReload.mockClear();
  });

  it('renders job definition and run history tabs with an injected service', () => {
    renderPage();

    expect(screen.getByRole('tab', { name: '任务定义' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '执行记录' })).toBeInTheDocument();
  });

  it('switches to run history and reloads runs after a trigger callback', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'open job trigger' }));
    await user.click(screen.getByRole('button', { name: 'complete trigger' }));

    await waitFor(() => {
      expect(mockState.runReload).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('tab', { name: '执行记录' })).toHaveAttribute('aria-selected', 'true');
  });
});
