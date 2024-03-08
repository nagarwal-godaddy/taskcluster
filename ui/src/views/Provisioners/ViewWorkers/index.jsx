import React, { Component, Fragment } from 'react';
import { graphql } from 'react-apollo';
import dotProp from 'dot-prop-immutable';
import { parse, stringify } from 'qs';
import { path, filter } from 'ramda';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import HammerIcon from 'mdi-react/HammerIcon';
import ProgressClockIcon from 'mdi-react/ProgressClockIcon';
import HourglassIcon from 'mdi-react/HourglassIcon';
import { Box, Chip } from '@material-ui/core';
import Spinner from '../../../components/Spinner';
import TextField from '../../../components/TextField';
import SpeedDial from '../../../components/SpeedDial';
import SpeedDialAction from '../../../components/SpeedDialAction';
import DialogAction from '../../../components/DialogAction';
import WorkersTable from '../../../components/WorkersTable';
import Dashboard from '../../../components/Dashboard';
import { VIEW_WORKERS_PAGE_SIZE } from '../../../utils/constants';
import { withAuth } from '../../../utils/Auth';
import ErrorPanel from '../../../components/ErrorPanel';
import Breadcrumbs from '../../../components/Breadcrumbs';
import Link from '../../../utils/Link';
import workersQuery from './workers.graphql';

const STATES = {
  requested: 'requested',
  running: 'running',
  stopping: 'stopping',
  stopped: 'stopped',
};

@withAuth
@graphql(workersQuery, {
  skip: props => !props.match.params.provisionerId,
  options: ({ location, match: { params } }) => ({
    errorPolicy: 'all',
    variables: {
      provisionerId: params.provisionerId,
      workerType: params.workerType,
      workersConnection: {
        limit: VIEW_WORKERS_PAGE_SIZE,
      },
      quarantined:
        parse(location.search.slice(1)).filterBy === 'quarantined'
          ? true
          : null,
      workerState: Object.values(STATES).includes(
        parse(location.search.slice(1)).filterBy
      )
        ? parse(location.search.slice(1)).filterBy
        : null,
    },
  }),
})
@withStyles(theme => ({
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  breadcrumbsPaper: {
    marginRight: theme.spacing(4),
    flex: 1,
  },
  dropdown: {
    minWidth: 200,
    marginTop: 0,
  },
  link: {
    ...theme.mixins.link,
  },
}))
export default class ViewWorkers extends Component {
  state = {
    actionLoading: false,
    dialogError: null,
    dialogOpen: false,
    selectedAction: null,
  };

  handleActionClick = async selectedAction => {
    this.setState({ dialogOpen: true, selectedAction });
  };

  handleActionError = dialogError => {
    this.setState({ dialogError, actionLoading: false });
  };

  // TODO: Action not working
  handleActionSubmit = async () => {
    const { selectedAction } = this.state;
    const {
      match: { params },
    } = this.props;
    const url = selectedAction.url
      .replace('<provisionerId>', params.provisionerId)
      .replace('<workerType>', params.workerType);

    this.setState({ actionLoading: true, dialogError: null });

    await fetch(url, {
      method: selectedAction.method,
      Authorization: `Bearer ${btoa(
        JSON.stringify(this.props.user.credentials)
      )}`,
    });

    this.setState({ actionLoading: false });
  };

  handleDialogClose = () => {
    this.setState({ dialogOpen: false, selectedAction: null });
  };

  handleFilterChange = ({ target }) => {
    const {
      location,
      data: { refetch },
      match: {
        params: { provisionerId, workerType },
      },
    } = this.props;
    const query = parse(location.search.slice(1));

    if (target.value) {
      query.filterBy = target.value;
    } else {
      delete query.filterBy;
    }

    this.props.history.replace(
      `/provisioners/${provisionerId}/worker-types/${workerType}${stringify(
        query,
        { addQueryPrefix: true }
      )}`
    );

    refetch({
      provisionerId,
      workerType,
      workersConnection: {
        limit: VIEW_WORKERS_PAGE_SIZE,
      },
      quarantined: target.value === 'quarantined' ? true : null,
      workerState: Object.values(STATES).includes(target.value)
        ? target.value
        : null,
    });
  };

  handlePageChange = ({ cursor, previousCursor }) => {
    const {
      match: {
        params: { provisionerId, workerType },
      },
      data: { fetchMore },
    } = this.props;
    const { filterBy } = parse(this.props.location.search.slice(1));

    return fetchMore({
      query: workersQuery,
      variables: {
        provisionerId,
        workerType,
        workersConnection: {
          limit: VIEW_WORKERS_PAGE_SIZE,
          cursor,
          previousCursor,
        },
        quarantined: filterBy === 'quarantined' ? true : null,
        workerState: Object.values(STATES).includes(filterBy) ? filterBy : null,
      },
      updateQuery(previousResult, { fetchMoreResult }) {
        const { edges, pageInfo } = fetchMoreResult.workers;

        if (!edges.length) {
          return previousResult;
        }

        return dotProp.set(previousResult, 'workers', workers =>
          dotProp.set(
            dotProp.set(workers, 'edges', edges),
            'pageInfo',
            pageInfo
          )
        );
      },
    });
  };

  shouldIgnoreGraphqlError = error => {
    const { data } = this.props;
    const workers = path(['workers', 'edges'], data);

    if (error && error.graphQLErrors && workers) {
      error.graphQLErrors.map(error => {
        const taskId = path(['requestInfo', 'params', 'taskId'], error);

        // ignores the error if task ID is not one of Most Recent Tasks
        return filter(worker => {
          return (
            path(['node', 'latestTask', 'run', 'taskId'], worker) === taskId &&
            error.statusCode === 404
          );
        }, workers);
      });
    }

    return true;
  };

  render() {
    const {
      actionLoading,
      selectedAction,
      dialogOpen,
      dialogError,
    } = this.state;
    const {
      location,
      classes,
      match: { params },
      data: { loading, error, workers, workerType },
    } = this.props;
    const query = parse(location.search.slice(1));
    const shouldIgnoreGraphqlError = this.shouldIgnoreGraphqlError(error);

    return (
      <Dashboard title="Workers">
        <Fragment>
          {(!workers || !workerType) && loading && <Spinner loading />}
          {!shouldIgnoreGraphqlError && <ErrorPanel fixed error={error} />}

          {shouldIgnoreGraphqlError && this.state.error && (
            <ErrorPanel fixed error={this.state.error} />
          )}
          <div className={classes.bar}>
            <Breadcrumbs classes={{ paper: classes.breadcrumbsPaper }}>
              <Link to="/provisioners">
                <Typography variant="body2" className={classes.link}>
                  Workers
                </Typography>
              </Link>
              <Link to={`/provisioners/${params.provisionerId}`}>
                <Typography variant="body2" className={classes.link}>
                  {params.provisionerId}
                </Typography>
              </Link>
              <Typography variant="body2" color="textSecondary">
                {`${params.workerType}`}
              </Typography>
            </Breadcrumbs>

            <Chip
              size="medium"
              icon={<HourglassIcon />}
              label="View Pending Tasks"
              component={Link}
              clickable
              to={`/provisioners/${params.provisionerId}/worker-types/${params.workerType}/pending-tasks`}
            />

            <Chip
              size="medium"
              icon={<ProgressClockIcon />}
              label="View Claimed Tasks"
              component={Link}
              clickable
              to={`/provisioners/${params.provisionerId}/worker-types/${params.workerType}/claimed-tasks`}
            />

            <Box marginTop={-2}>
              <TextField
                disabled={loading}
                className={classes.dropdown}
                select
                label="Filter By"
                value={query.filterBy || ''}
                onChange={this.handleFilterChange}>
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="quarantined">Quarantined</MenuItem>
                <MenuItem value="requested">Requested</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="stopping">Stopping</MenuItem>
                <MenuItem value="stopped">Stopped</MenuItem>
              </TextField>
            </Box>
          </div>
          <br />
          <WorkersTable
            workersConnection={workers}
            onPageChange={this.handlePageChange}
            workerType={params.workerType}
            provisionerId={params.provisionerId}
          />
          {workerType?.actions?.length ? (
            <SpeedDial>
              {workerType.actions.map(action => (
                <SpeedDialAction
                  requiresAuth
                  tooltipOpen
                  key={action.title}
                  FabProps={{
                    disabled: actionLoading,
                  }}
                  icon={<HammerIcon />}
                  tooltipTitle={action.title}
                  onClick={() => this.handleActionClick(action)}
                />
              ))}
            </SpeedDial>
          ) : null}
          {dialogOpen && (
            <DialogAction
              error={dialogError}
              open={dialogOpen}
              title={`${selectedAction.title}?`}
              body={selectedAction.description}
              confirmText={selectedAction.title}
              onSubmit={this.handleActionSubmit}
              onError={this.handleActionError}
              onComplete={this.handleDialogClose}
              onClose={this.handleDialogClose}
            />
          )}
        </Fragment>
      </Dashboard>
    );
  }
}
