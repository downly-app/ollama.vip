import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toast } from '@/components/ui/use-toast';
import i18n from '@/i18n';
import { ollamaApi } from '@/services/ollamaApi';

export type DownloadStatus =
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'pending'
  | 'finalizing';

export interface DownloadTask {
  id: string; // modelName
  modelName: string;
  status: DownloadStatus;
  total: number;
  completed: number;
  progress: number;
  speed: number; // in bytes/s
  remainingTime: number; // in seconds
  error?: string;
  startedAt: number; // timestamp
  completedAt?: number; // timestamp
}

interface DownloadState {
  tasks: Record<string, DownloadTask>;
  abortControllers: Map<string, AbortController>;
  startDownload: (model: { name: string; size: number }) => Promise<void>;
  pauseDownload: (modelName: string) => void;
  retryDownload: (modelName: string) => void;
  clearTask: (modelName: string) => void;
  clearAllCompleted: () => void;
}

const updateTaskState = (modelName: string, updates: Partial<DownloadTask>) => {
  useDownloadStore.setState(state => ({
    tasks: {
      ...state.tasks,
      [modelName]: {
        ...state.tasks[modelName],
        ...updates,
      },
    },
  }));
};

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      tasks: {},
      abortControllers: new Map(),

      startDownload: async model => {
        const { name: modelName, size: modelSize } = model;
        const { tasks, abortControllers } = get();

        if (tasks[modelName]?.status === 'downloading') {
          // Download already in progress
          return;
        }

        const abortController = new AbortController();
        set(state => ({
          abortControllers: new Map(state.abortControllers).set(modelName, abortController),
        }));

        const initialTask: DownloadTask = {
          id: modelName,
          modelName,
          status: 'pending',
          total: modelSize,
          completed: 0,
          progress: 0,
          speed: 0,
          remainingTime: Infinity,
          startedAt: Date.now(),
        };
        set(state => ({
          tasks: {
            ...state.tasks,
            [modelName]: initialTask,
          },
        }));

        let lastProgressTime = Date.now();
        let lastCompleted = 0;
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 500; // Update UI every 500ms to reduce flickering

        try {
          await ollamaApi.pullModel(
            modelName,
            progress => {
              if (abortController.signal.aborted) {
                throw new Error('Download aborted by user');
              }

              const now = Date.now();
              const timeDiff = (now - lastProgressTime) / 1000; // in seconds
              const bytesDiff = progress.completed - lastCompleted;

              let speed = 0;
              if (timeDiff > 0) {
                speed = bytesDiff / timeDiff;
              }

              const remainingBytes = progress.total - progress.completed;
              const remainingTime = speed > 0 ? remainingBytes / speed : Infinity;

              // Only update UI every UPDATE_INTERVAL milliseconds to reduce flickering
              if (
                now - lastUpdateTime >= UPDATE_INTERVAL ||
                progress.completed === progress.total
              ) {
                updateTaskState(modelName, {
                  status: 'downloading',
                  total: progress.total || 0,
                  completed: progress.completed || 0,
                  progress:
                    (progress.total || 0) > 0
                      ? ((progress.completed || 0) / (progress.total || 1)) * 100
                      : 0,
                  speed,
                  remainingTime,
                });
                lastUpdateTime = now;
              }

              lastProgressTime = now;
              lastCompleted = progress.completed;
            },
            abortController.signal
          );

          updateTaskState(modelName, { status: 'finalizing', speed: 0 });

          const models = await ollamaApi.listModels();
          const completedModel = models.find(m => m.name === modelName);
          const finalSize = completedModel
            ? completedModel.size
            : get().tasks[modelName]?.total || 0;

          updateTaskState(modelName, {
            status: 'completed',
            progress: 100,
            speed: 0,
            remainingTime: 0,
            completedAt: Date.now(),
            total: finalSize,
          });

          toast({
            title: i18n.t('downloads.toast.downloadCompleteTitle'),
            description: i18n.t('downloads.toast.downloadCompleteMessage', { modelName }),
          });
        } catch (error: any) {
          if (error.message === 'Download aborted by user') {
            // Download was paused
            updateTaskState(modelName, { status: 'paused', speed: 0 });
          } else {
            // Download failed
            updateTaskState(modelName, {
              status: 'error',
              error: error.message || 'Unknown error',
            });
          }
        } finally {
          get().abortControllers.delete(modelName);
          set(state => ({ abortControllers: new Map(state.abortControllers) }));
        }
      },

      pauseDownload: modelName => {
        const { abortControllers } = get();
        const controller = abortControllers.get(modelName);
        if (controller) {
          controller.abort();
        }
      },

      retryDownload: modelName => {
        const { startDownload, tasks } = get();
        const task = tasks[modelName];
        if (task) {
          startDownload({ name: modelName, size: task.total });
        } else {
          // Cannot retry download for non-existent task
        }
      },

      clearTask: modelName => {
        set(state => {
          const newTasks = { ...state.tasks };
          delete newTasks[modelName];
          return { tasks: newTasks };
        });
        get().pauseDownload(modelName); // Also abort any running request
      },

      clearAllCompleted: () => {
        set(state => {
          const newTasks = { ...state.tasks };
          Object.keys(newTasks).forEach(key => {
            if (newTasks[key].status === 'completed') {
              delete newTasks[key];
            }
          });
          return { tasks: newTasks };
        });
      },
    }),
    {
      name: 'download-storage',
      partialize: state => ({
        tasks: state.tasks,
      }),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) };
        // Ensure abortControllers is always a fresh Map on hydration,
        // ignoring any persisted (and likely non-serializable/invalid) value.
        merged.abortControllers = new Map();
        return merged as DownloadState;
      },
    }
  )
);
