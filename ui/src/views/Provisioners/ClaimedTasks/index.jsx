import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import dotProp from 'dot-prop-immutable';
import { TableRow, TableCell, Chip, Box, Typography } from '@material-ui/core';
import LinkIcon from 'mdi-react/LinkIcon';
import HourglassIcon from 'mdi-react/HourglassIcon';
import WorkerIcon from 'mdi-react/WorkerIcon';
import Spinner from '../../../components/Spinner';
import Dashboard from '../../../components/Dashboard';
import { VIEW_WORKER_POOL_PENDING_TASKS_PAGE_SIZE } from '../../../utils/constants';
import claimedTasks from './claimedTasks.graphql';
import ConnectionDataTable from '../../../components/ConnectionDataTable';
import Link from '../../../utils/Link';
import TableCellItem from '../../../components/TableCellItem';
import DateDistance from '../../../components/DateDistance';
import Breadcrumbs from '../../../components/Breadcrumbs';
import ErrorPanel from '../../../components/ErrorPanel';

@graphql(claimedTasks, {
  options: props => ({
    variables: {
      taskQueueId: `${props.match.params.provisionerId}/${props.match.params.workerType}`,
      connection: {
        limit: VIEW_WORKER_POOL_PENDING_TASKS_PAGE_SIZE,
      },
    },
  }),
})
export default class WMViewClaimedTasks extends Component {
  handlePageChange = ({ cursor, previousCursor }) => {
    const {
      data: { fetchMore },
      match: { params },
    } = this.props;

    return fetchMore({
      query: claimedTasks,
      variables: {
        taskQueueId: `${params.provisionerId}/${params.workerType}`,
        connection: {
          limit: VIEW_WORKER_POOL_PENDING_TASKS_PAGE_SIZE,
          cursor,
          previousCursor,
        },
      },
      updateQuery(previousResult, { fetchMoreResult: { listClaimedTasks } }) {
        // use dotProp.set to avoid lint warning about assigning to properties
        return dotProp.set(
          previousResult,
          'listClaimedTasks',
          listClaimedTasks
        );
      },
    });
  };

  get workersLink() {
    const { provisionerId, workerType } = this.props.match.params;

    return `/provisioners/${provisionerId}/worker-types/${workerType}`;
  }

  renderRow({ node: { taskId, runId, claimed, task, workerGroup, workerId } }) {
    return (
      <TableRow key={taskId}>
        <TableCell>
          <Link to={`/tasks/${taskId}`}>
            <TableCellItem button>
              {taskId}
              <LinkIcon size={16} />
            </TableCellItem>
          </Link>
        </TableCell>
        <TableCell>{runId}</TableCell>
        <TableCell>{workerGroup}</TableCell>
        <TableCell>
          <Link to={`${this.workersLink}/workers/${workerGroup}/${workerId}`}>
            <TableCellItem button>
              {workerId}
              <LinkIcon size={16} />
            </TableCellItem>
          </Link>
        </TableCell>
        <TableCell>
          <DateDistance from={new Date(claimed)} />
        </TableCell>
        <TableCell>{task.metadata?.name}</TableCell>
      </TableRow>
    );
  }

  render() {
    const {
      data: { loading, error, listClaimedTasks },
    } = this.props;
    const { provisionerId, workerType } = this.props.match.params;

    return (
      <Dashboard
        title={`Claimed tasks in "${provisionerId}/${workerType}"`}
        disableTitleFormatting>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            width: '100%',
          }}>
          <div style={{ flexGrow: 1, marginRight: 8 }}>
            <Breadcrumbs>
              <Link to="/provisioners">
                <Typography variant="body2">Workers</Typography>
              </Link>
              <Link to={`/provisioners/${provisionerId}`}>
                <Typography variant="body2">{provisionerId}</Typography>
              </Link>
              <Link
                to={`/provisioners/${provisionerId}/worker-types/${workerType}`}>
                <Typography variant="body2">{workerType}</Typography>
              </Link>
              <Typography variant="body2" color="textSecondary">
                Claimed Tasks
              </Typography>
            </Breadcrumbs>
          </div>
          <div>
            <Chip
              size="medium"
              icon={<HourglassIcon />}
              label="View Pending Tasks"
              component={Link}
              clickable
              to={`${this.workersLink}/pending-tasks`}
              style={{ marginRight: 4 }}
            />
            <Chip
              size="medium"
              icon={<WorkerIcon />}
              label="Workers (Queue View)"
              component={Link}
              clickable
              to={this.workersLink}
            />
          </div>
        </Box>
        {loading && <Spinner loading />}

        {error && <ErrorPanel fixed error={error} />}

        {!error && !loading && (
          <ConnectionDataTable
            noItemsMessage="No claimed tasks"
            connection={listClaimedTasks}
            pageSize={VIEW_WORKER_POOL_PENDING_TASKS_PAGE_SIZE}
            renderRow={row => this.renderRow(row)}
            onPageChange={this.handlePageChange}
            headers={[
              'Task ID',
              'Run ID',
              'Worker Group',
              'Worker Id',
              'Claimed',
              'Title',
            ]}
          />
        )}
      </Dashboard>
    );
  }
}
