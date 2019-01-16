/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions } from 'redux-actions';

import { RepositoryUri, WorkerReservedProgress } from '../../model';
import {
  loadStatus,
  loadStatusFailed,
  loadStatusSuccess,
  updateCloneProgress,
  updateDeleteProgress,
  updateIndexProgress,
} from '../actions/status';

export enum RepoState {
  CLONING,
  DELETING,
  INDEXING,
  READY,
  CLONE_ERROR,
  DELETE_ERROR,
  INDEX_ERROR,
}

export interface RepoStatus {
  state: RepoState;
  progress?: number;
  cloneProgress?: any;
}

export interface StatusState {
  status: { [key: string]: RepoStatus };
  loading: boolean;
  error?: Error;
}

const initialState: StatusState = {
  status: {},
  loading: false,
};

export const status = handleActions(
  {
    [String(loadStatus)]: (state: StatusState) =>
      produce<StatusState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadStatusSuccess)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        Object.keys(action.payload).forEach((repoUri: RepositoryUri) => {
          const statuses = action.payload[repoUri];
          if (statuses.deleteStatus) {
            // 1. Look into delete status first
            const progress = statuses.deleteStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.deleteStatus,
                state: RepoState.DELETE_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.deleteStatus,
                state: RepoState.DELETING,
              };
            }
          } else if (statuses.indexStatus) {
            const progress = statuses.indexStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.INDEX_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.INDEXING,
              };
            } else if (progress === WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.READY,
              };
            }
          } else if (statuses.gitStatus) {
            const progress = statuses.gitStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.CLONE_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.CLONING,
              };
            } else if (progress === WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.READY,
              };
            }
          }
        });
        draft.loading = false;
      }),
    [String(loadStatusFailed)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.loading = false;
        draft.error = action.payload;
      }),
    [String(updateCloneProgress)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.status[action.payload.repoUri] = {
          ...action.payload,
          state: RepoState.CLONING,
        };
      }),
    [String(updateIndexProgress)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        const progress = action.payload.progress;
        draft.status[action.payload.repoUri] = {
          ...action.payload,
          state: progress < WorkerReservedProgress.COMPLETED ? RepoState.INDEXING : RepoState.READY,
        };
      }),
    [String(updateDeleteProgress)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.status[action.payload.repoUri] = {
          ...action.payload,
          state: RepoState.DELETING,
        };
      }),
  },
  initialState
);
