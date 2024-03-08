import React, { Component, Fragment } from 'react';
import { graphql } from 'react-apollo';
import { withStyles } from '@material-ui/core/styles';
import ArrowLeftIcon from 'mdi-react/ArrowLeftIcon';
import OpenInNewIcon from 'mdi-react/OpenInNewIcon';
import Dashboard from '../../../components/Dashboard';
import Button from '../../../components/Button';
import Log from '../../../components/Log';
import Link from '../../../utils/Link';
import Helmet from '../../../components/Helmet';
import taskQuery from './task.graphql';
import Search from '../../../components/Search';
import ErrorPanel from '../../../components/ErrorPanel';
import { getArtifactUrl } from '../../../utils/getArtifactUrl';
import { withAuth } from '../../../utils/Auth';

@withAuth
@withStyles(theme => ({
  fab: {
    ...theme.mixins.fab,
    ...theme.mixins.actionButton,
    bottom: theme.spacing(3),
    right: theme.spacing(12),
  },
  rawLog: {
    ...theme.mixins.fab,
    ...theme.mixins.actionButton,
    bottom: theme.spacing(3),
    right: theme.spacing(3),
  },
}))
@graphql(taskQuery, {
  options: props => ({
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
    variables: {
      taskId: props.match.params.taskId,
    },
  }),
})
export default class TaskLog extends Component {
  getCurrentRun() {
    return (
      this.props.data.task &&
      this.props.data.task.status.runs[this.props.match.params.runId]
    );
  }

  getLogUrl() {
    const {
      user,
      match: {
        params: { taskId, runId, name: rawName },
      },
    } = this.props;
    let name;

    // for compatibility, if `name` is an encoded URL-shaped thing, try to
    // extract the artifact name.
    if (rawName.startsWith('https%3A')) {
      const maybeArtifactUrl = decodeURIComponent(rawName);
      const match = new RegExp(
        '.*/api/queue/v1/task/[^/]{22}/runs/\\d+/artifacts/([^?]+)'
      ).exec(maybeArtifactUrl);

      if (match) {
        // eslint-disable-next-line prefer-destructuring
        name = match[1];
      }
    } else {
      name = rawName;
    }

    return getArtifactUrl({ user, taskId, runId, name });
  }

  goToLog() {
    // as log url contains bewit, the link could expire
    // raw logs will be opened in new tab/window
    const url = this.getLogUrl();

    window.open(url, '_blank', 'noopener noreferrer');
  }

  render() {
    const {
      classes,
      match,
      stream,
      data: { task },
    } = this.props;
    const url = this.getLogUrl();
    const run = this.getCurrentRun();

    if (!url) {
      return (
        <ErrorPanel error={new Error('Could not determine log artifact URL')} />
      );
    }

    return (
      <Dashboard
        title={task ? `Log "${task.metadata.name}"` : 'Log'}
        disableTitleFormatting
        disablePadding
        search={
          <Search
            placeholder="Search Task ID"
            onSubmit={this.handleTaskSearchSubmit}
          />
        }>
        <Helmet state={run && run.state} />
        <Log
          url={url}
          stream={stream}
          actions={
            <Fragment>
              <Link
                to={`/tasks/${match.params.taskId}/runs/${match.params.runId}`}>
                <Button
                  spanProps={{ className: classes.fab }}
                  tooltipProps={{ title: 'View Task' }}
                  variant="round"
                  color="secondary">
                  <ArrowLeftIcon />
                </Button>
              </Link>
              <Button
                onClick={() => this.goToLog()}
                spanProps={{ className: classes.rawLog }}
                tooltipProps={{ title: 'Raw Log' }}
                variant="round"
                color="secondary">
                <OpenInNewIcon size={20} />
              </Button>
            </Fragment>
          }
        />
      </Dashboard>
    );
  }

  handleTaskSearchSubmit = taskId => {
    this.props.history.push(`/tasks/${taskId}`);
  };
}
