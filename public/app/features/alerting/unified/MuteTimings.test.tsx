import { fireEvent, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TestProvider } from 'test/helpers/TestProvider';
import { byRole, byTestId, byText } from 'testing-library-selector';

import { locationService, setDataSourceSrv } from '@grafana/runtime';
import { AlertManagerCortexConfig, MuteTimeInterval } from 'app/plugins/datasource/alertmanager/types';
import { AccessControlAction } from 'app/types';

import MuteTimings from './MuteTimings';
import { fetchAlertManagerConfig, updateAlertManagerConfig } from './api/alertmanager';
import { MockDataSourceSrv, grantUserPermissions, mockDataSource } from './mocks';
import { DataSourceType } from './utils/datasource';

jest.mock('./api/alertmanager');

const mocks = {
  api: {
    fetchAlertManagerConfig: jest.mocked(fetchAlertManagerConfig),
    updateAlertManagerConfig: jest.mocked(updateAlertManagerConfig),
  },
};

const renderMuteTimings = (location = '/alerting/routes/mute-timing/new') => {
  locationService.push(location);

  return render(
    <TestProvider>
      <MuteTimings />
    </TestProvider>
  );
};

const dataSources = {
  am: mockDataSource({
    name: 'Alertmanager',
    type: DataSourceType.Alertmanager,
  }),
};

const ui = {
  form: byTestId('mute-timing-form'),
  nameField: byTestId('mute-timing-name'),

  startsAt: byTestId('mute-timing-starts-at'),
  endsAt: byTestId('mute-timing-ends-at'),
  addTimeRange: byRole('button', { name: /add another time range/i }),

  weekdays: byTestId('mute-timing-weekdays'),
  days: byTestId('mute-timing-days'),
  months: byTestId('mute-timing-months'),
  years: byTestId('mute-timing-years'),

  addInterval: byRole('button', { name: /add another time interval/i }),
  submitButton: byText(/submit/i),
};

const muteTimeInterval: MuteTimeInterval = {
  name: 'default-mute',
  time_intervals: [
    {
      times: [
        {
          start_time: '12:00',
          end_time: '24:00',
        },
      ],
      days_of_month: ['15', '-1'],
      months: ['august:december', 'march'],
    },
  ],
};
const muteTimeInterval2: MuteTimeInterval = {
  name: 'default-mute2',
  time_intervals: [
    {
      times: [
        {
          start_time: '12:00',
          end_time: '24:00',
        },
      ],
      days_of_month: ['15', '-1'],
      months: ['august:december', 'march'],
    },
  ],
};

const defaultConfig: AlertManagerCortexConfig = {
  alertmanager_config: {
    receivers: [{ name: 'default' }, { name: 'critical' }],
    route: {
      receiver: 'default',
      group_by: ['alertname'],
      routes: [
        {
          matchers: ['env=prod', 'region!=EU'],
          mute_time_intervals: [muteTimeInterval.name],
        },
      ],
    },
    templates: [],
    mute_time_intervals: [muteTimeInterval],
  },
  template_files: {},
};
const defaultConfigWithNewTimeIntervalsField: AlertManagerCortexConfig = {
  alertmanager_config: {
    receivers: [{ name: 'default' }, { name: 'critical' }],
    route: {
      receiver: 'default',
      group_by: ['alertname'],
      routes: [
        {
          matchers: ['env=prod', 'region!=EU'],
          mute_time_intervals: [muteTimeInterval.name],
        },
      ],
    },
    templates: [],
    time_intervals: [muteTimeInterval],
  },
  template_files: {},
};

const defaultConfigWithBothTimeIntervalsField: AlertManagerCortexConfig = {
  alertmanager_config: {
    receivers: [{ name: 'default' }, { name: 'critical' }],
    route: {
      receiver: 'default',
      group_by: ['alertname'],
      routes: [
        {
          matchers: ['env=prod', 'region!=EU'],
          mute_time_intervals: [muteTimeInterval.name],
        },
      ],
    },
    templates: [],
    time_intervals: [muteTimeInterval],
    mute_time_intervals: [muteTimeInterval2],
  },
  template_files: {},
};

const resetMocks = () => {
  jest.resetAllMocks();

  mocks.api.fetchAlertManagerConfig.mockImplementation(() => {
    return Promise.resolve({ ...defaultConfig });
  });
  mocks.api.updateAlertManagerConfig.mockImplementation(() => {
    return Promise.resolve();
  });
};

describe('Mute timings', () => {
  beforeEach(() => {
    setDataSourceSrv(new MockDataSourceSrv(dataSources));
    resetMocks();
    // FIXME: scope down
    grantUserPermissions(Object.values(AccessControlAction));
  });

  it('creates a new mute timing, with mute_time_intervals in config', async () => {
    renderMuteTimings();

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    expect(ui.nameField.get()).toBeInTheDocument();

    await userEvent.type(ui.nameField.get(), 'maintenance period');
    await userEvent.type(ui.startsAt.get(), '22:00');
    await userEvent.type(ui.endsAt.get(), '24:00');
    await userEvent.type(ui.days.get(), '-1');
    await userEvent.type(ui.months.get(), 'january, july');

    fireEvent.submit(ui.form.get());

    await waitFor(() => expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalled());

    const { mute_time_intervals: _, ...configWithoutMuteTimings } = defaultConfig.alertmanager_config;
    expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalledWith('grafana', {
      ...defaultConfig,
      alertmanager_config: {
        ...configWithoutMuteTimings,
        mute_time_intervals: [
          muteTimeInterval,
          {
            name: 'maintenance period',
            time_intervals: [
              {
                days_of_month: ['-1'],
                months: ['january', 'july'],
                times: [
                  {
                    start_time: '22:00',
                    end_time: '24:00',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('creates a new mute timing, with time_intervals in config', async () => {
    mocks.api.fetchAlertManagerConfig.mockImplementation(() => {
      return Promise.resolve({
        ...defaultConfigWithNewTimeIntervalsField,
      });
    });
    renderMuteTimings();

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    expect(ui.nameField.get()).toBeInTheDocument();

    await userEvent.type(ui.nameField.get(), 'maintenance period');
    await userEvent.type(ui.startsAt.get(), '22:00');
    await userEvent.type(ui.endsAt.get(), '24:00');
    await userEvent.type(ui.days.get(), '-1');
    await userEvent.type(ui.months.get(), 'january, july');

    fireEvent.submit(ui.form.get());

    await waitFor(() => expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalled());

    const { mute_time_intervals: _, ...configWithoutMuteTimings } = defaultConfig.alertmanager_config;
    expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalledWith('grafana', {
      ...defaultConfig,
      alertmanager_config: {
        ...configWithoutMuteTimings,
        mute_time_intervals: [
          muteTimeInterval,
          {
            name: 'maintenance period',
            time_intervals: [
              {
                days_of_month: ['-1'],
                months: ['january', 'july'],
                times: [
                  {
                    start_time: '22:00',
                    end_time: '24:00',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });
  it('creates a new mute timing, with time_intervals and mute_time_intervals in config', async () => {
    mocks.api.fetchAlertManagerConfig.mockImplementation(() => {
      return Promise.resolve({
        ...defaultConfigWithBothTimeIntervalsField,
      });
    });
    renderMuteTimings();

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    expect(ui.nameField.get()).toBeInTheDocument();

    await userEvent.type(ui.nameField.get(), 'maintenance period');
    await userEvent.type(ui.startsAt.get(), '22:00');
    await userEvent.type(ui.endsAt.get(), '24:00');
    await userEvent.type(ui.days.get(), '-1');
    await userEvent.type(ui.months.get(), 'january, july');

    fireEvent.submit(ui.form.get());

    await waitFor(() => expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalled());

    const { mute_time_intervals, time_intervals, ...configWithoutMuteTimings } = defaultConfig.alertmanager_config;
    expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalledWith('grafana', {
      ...defaultConfig,
      alertmanager_config: {
        ...configWithoutMuteTimings,
        mute_time_intervals: [
          muteTimeInterval,
          muteTimeInterval2,
          {
            name: 'maintenance period',
            time_intervals: [
              {
                days_of_month: ['-1'],
                months: ['january', 'july'],
                times: [
                  {
                    start_time: '22:00',
                    end_time: '24:00',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('prepopulates the form when editing a mute timing', async () => {
    renderMuteTimings('/alerting/routes/mute-timing/edit' + `?muteName=${encodeURIComponent(muteTimeInterval.name)}`);

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    expect(ui.nameField.get()).toBeInTheDocument();
    expect(ui.nameField.get()).toHaveValue(muteTimeInterval.name);
    expect(ui.months.get()).toHaveValue(muteTimeInterval.time_intervals[0].months?.join(', '));

    await userEvent.clear(ui.startsAt.getAll()?.[0]);
    await userEvent.clear(ui.endsAt.getAll()?.[0]);
    await userEvent.clear(ui.days.get());
    await userEvent.clear(ui.months.get());
    await userEvent.clear(ui.years.get());

    const monday = within(ui.weekdays.get()).getByText('Mon');
    await userEvent.click(monday);
    await userEvent.type(ui.days.get(), '-7:-1');
    await userEvent.type(ui.months.get(), '3, 6, 9, 12');
    await userEvent.type(ui.years.get(), '2021:2024');

    fireEvent.submit(ui.form.get());

    await waitFor(() => expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalled());
    expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalledWith('grafana', {
      alertmanager_config: {
        receivers: [
          {
            name: 'default',
          },
          {
            name: 'critical',
          },
        ],
        route: {
          receiver: 'default',
          group_by: ['alertname'],
          routes: [
            {
              matchers: ['env=prod', 'region!=EU'],
              mute_time_intervals: ['default-mute'],
            },
          ],
        },
        templates: [],
        mute_time_intervals: [
          {
            name: 'default-mute',
            time_intervals: [
              {
                weekdays: ['monday'],
                days_of_month: ['-7:-1'],
                months: ['3', '6', '9', '12'],
                years: ['2021:2024'],
              },
            ],
          },
        ],
      },
      template_files: {},
    });
  });

  it('form is invalid with duplicate mute timing name', async () => {
    renderMuteTimings();

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    await waitFor(() => expect(ui.nameField.get()).toBeInTheDocument());
    await userEvent.type(ui.nameField.get(), 'default-mute');
    await userEvent.type(ui.days.get(), '1');
    await waitFor(() => expect(ui.nameField.get()).toHaveValue('default-mute'));

    fireEvent.submit(ui.form.get());

    // Form state should be invalid and prevent firing of update action
    await waitFor(() => expect(byRole('alert').get()).toBeInTheDocument());
    expect(mocks.api.updateAlertManagerConfig).not.toHaveBeenCalled();
  });

  it('replaces mute timings in routes when the mute timing name is changed', async () => {
    renderMuteTimings('/alerting/routes/mute-timing/edit' + `?muteName=${encodeURIComponent(muteTimeInterval.name)}`);

    await waitFor(() => expect(mocks.api.fetchAlertManagerConfig).toHaveBeenCalled());
    expect(ui.nameField.get()).toBeInTheDocument();
    expect(ui.nameField.get()).toHaveValue(muteTimeInterval.name);

    await userEvent.clear(ui.nameField.get());
    await userEvent.type(ui.nameField.get(), 'Lunch breaks');

    fireEvent.submit(ui.form.get());

    await waitFor(() => expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalled());
    expect(mocks.api.updateAlertManagerConfig).toHaveBeenCalledWith('grafana', {
      alertmanager_config: {
        receivers: [
          {
            name: 'default',
          },
          {
            name: 'critical',
          },
        ],
        route: {
          receiver: 'default',
          group_by: ['alertname'],
          routes: [
            {
              matchers: ['env=prod', 'region!=EU'],
              mute_time_intervals: ['Lunch breaks'],
            },
          ],
        },
        templates: [],
        mute_time_intervals: [
          {
            name: 'Lunch breaks',
            time_intervals: [
              {
                times: [
                  {
                    start_time: '12:00',
                    end_time: '24:00',
                  },
                ],
                days_of_month: ['15', '-1'],
                months: ['august:december', 'march'],
              },
            ],
          },
        ],
      },
      template_files: {},
    });
  });
});
