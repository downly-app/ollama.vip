import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toast } from '@/components/ui/use-toast';
import i18n from '@/i18n';
import { ollamaTauriApi } from '@/services/ollamaTauriApi';

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
  // Store speed calculation window per task to avoid cross-task interference
  speedWindow?: {timestamp: number, completed: number}[];
  lastUpdateTime?: number; // For throttling at task level
}

interface DownloadState {
  tasks: Record<string, DownloadTask>;
  abortControllers: Map<string, AbortController>;
  startDownload: (model: { name: string; size?: number }) => Promise<void>;
  pauseDownload: (modelName: string, cleanup?: boolean) => void;
  restartDownload: (modelName: string) => void;
  retryDownload: (modelName:string) => void;
  clearTask: (modelName: string, cleanup?: boolean) => void;
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
          console.log(`Download for ${modelName} already in progress, ignoring request`);
          return;
        }

        console.log(`Starting download for ${modelName} with estimated size: ${modelSize || 'unknown'}`);
        
        // Create abort controller - one per task
        const abortController = new AbortController();
        set(state => ({
          abortControllers: new Map(state.abortControllers).set(modelName, abortController),
        }));

        // Check if there's an existing paused task
        const existingTask = tasks[modelName];
        const isResuming = existingTask && existingTask.status === 'paused';
        
        if (isResuming) {
          // If resuming download, keep progress data but reset speed info
          console.log(`Resuming paused download for ${modelName}`);
          updateTaskState(modelName, {
            status: 'downloading',
            speed: 0,
            error: undefined,
          });
        } else {
          // If it's a new download or retry of failed download, create new task
          console.log(`Creating new download task for ${modelName}`);
          
          const initialTask: DownloadTask = {
            id: modelName,
            modelName,
            status: 'pending',
            total: modelSize || 0,
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
        }

        // Speed and throttling calculations
        const SPEED_WINDOW_SIZE = 5; // Window size for speed calculation
        const THROTTLE_INTERVAL = 200; // ms between UI updates
        const speedDataPoints: {timestamp: number, completed: number}[] = [];
        let lastUpdateTime = 0;
        
        // Retry mechanism settings
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000; // Base retry delay in milliseconds

        try {            
          // Define a download attempt function with auto-retry support
          const attemptDownload = async (): Promise<string> => {
            try {
              console.log(`Starting model pull for ${modelName}`);
              
              // Call the API with the abort signal and a unique identifier
              return await ollamaTauriApi.pullModel(
                modelName, 
                (progress) => {
                  // Get current timestamp
                  const now = Date.now();
                  
                  // Apply throttling for non-critical updates
                  if (progress.status !== 'success' && progress.status !== 'error') {
                    if (now - lastUpdateTime < THROTTLE_INTERVAL) {
                      // Skip this update due to throttling
                      return;
                    }
                  }
                  
                  // Update the last update time
                  lastUpdateTime = now;
                  
                  // Handle error status
                  if (progress.status === 'error') {
                    console.error(`Download error for ${modelName}:`, progress);
                    updateTaskState(modelName, {
                      status: 'error',
                      error: 'Error occurred during download'
                    });
                    return;
                  }
                  
                  // Prepare update object
                  const updates: Partial<DownloadTask> = {
                    status: progress.status === 'success' ? 'finalizing' : 'downloading',
                  };
                  
                  // Only calculate progress when we have valid total and completed amounts
                  if (progress.total && progress.completed && progress.total > 0) {
                    // Add data point for speed calculation
                    speedDataPoints.push({
                      timestamp: now,
                      completed: progress.completed
                    });
                    
                    // Keep window size within limit
                    if (speedDataPoints.length > SPEED_WINDOW_SIZE) {
                      speedDataPoints.shift();
                    }
                    
                    // Calculate speed based on sliding window
                    let speedBytesPerSec = 0;
                    if (speedDataPoints.length >= 2) {
                      const oldestPoint = speedDataPoints[0];
                      const bytesProgress = progress.completed - oldestPoint.completed;
                      const timeProgress = (now - oldestPoint.timestamp) / 1000; // seconds
                      
                      if (timeProgress > 0) {
                        speedBytesPerSec = bytesProgress / timeProgress;
                      }
                    } else {
                      // Fallback: Use average speed since the task started
                      // This provides an initial speed estimate before enough data points are collected
                      const task = get().tasks[modelName];
                      if (task && task.startedAt) {
                        const elapsedSeconds = (now - task.startedAt) / 1000;
                        if (elapsedSeconds > 0) {
                          speedBytesPerSec = progress.completed / elapsedSeconds;
                        }
                      }
                    }
                    
                    const remaining = progress.total - progress.completed;
                    const remainingTime = speedBytesPerSec > 0 ? remaining / speedBytesPerSec : Infinity;
                    const progressPercent = (progress.completed / progress.total) * 100;
                    
                    // Update task state with all progress data
                    Object.assign(updates, {
                      total: progress.total,
                      completed: progress.completed,
                      progress: progressPercent,
                      speed: speedBytesPerSec,
                      remainingTime: remainingTime
                    });
                  } else if (progress.digest) {
                    // Even without progress data, update status to show download is ongoing
                    Object.assign(updates, {
                      status: 'downloading'
                    });
                  }
                  
                  // Apply updates
                  updateTaskState(modelName, updates);
                }, 
                // Pass the abort signal to enable true cancellation
                abortController.signal
              );
            } catch (error: any) {
              // Check if it's a user-initiated abort
              if (error.message === 'Download aborted by user' || 
                  abortController.signal.aborted) {
                console.log(`Download of ${modelName} was aborted by user`);
                // No need to throw for user aborts - we'll handle this specially
                return 'Download paused by user';
              }
              
              // Handle retryable network errors
              const isNetworkError = error.message && (
                error.message.includes('network') || 
                error.message.includes('timeout') || 
                error.message.includes('connection')
              );
              
              if (isNetworkError && retryCount < MAX_RETRIES) {
                retryCount++;
                console.warn(`Download failed for ${modelName}, attempt ${retryCount} of ${MAX_RETRIES}`);
                
                // Update UI to show retry status
                updateTaskState(modelName, { 
                  status: 'downloading', 
                  error: `Connection error, retrying (${retryCount}/${MAX_RETRIES})` 
                });
                
                // Exponential backoff for retries
                const delayMs = RETRY_DELAY * Math.pow(2, retryCount - 1);
                console.log(`Waiting ${delayMs}ms before retry ${retryCount}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                // Try again
                return await attemptDownload();
              }
              
              // Max retries reached or non-retryable error
              throw error;
            }
          };
          
          // Start the download process
          await attemptDownload();

          // Check if this is a successful completion (not aborted)
          if (!abortController.signal.aborted) {
            // Get updated model list to confirm download and get actual size
            const models = await ollamaTauriApi.listModels();
            const completedModel = models.find(m => m.name === modelName);
            const finalSize = completedModel
              ? (typeof completedModel.size === 'number' ? completedModel.size : parseInt(completedModel.size as any, 10))
              : get().tasks[modelName]?.total || 0;

            // Update to completed status
            updateTaskState(modelName, {
              status: 'completed',
              progress: 100,
              completed: finalSize,
              total: finalSize,
              completedAt: Date.now(),
            });

            // Show download completion notification
            toast({
              title: i18n.t('downloads.toast.downloadCompleteTitle'),
              description: i18n.t('downloads.toast.downloadCompleteMessage', { modelName }),
              duration: 5000,
            });
            
            console.log(`Download completed successfully for ${modelName}`);
          }
        } catch (error: any) {
          if (error.message === 'Download aborted by user' || 
              abortController.signal.aborted) {
            // Download was paused by user - update UI
            console.log(`Confirming pause state for ${modelName}`);
            updateTaskState(modelName, { 
              status: 'paused', 
              speed: 0,
              error: undefined // Clear any error message
            });
          } else {
            // Download failed with error
            console.error(`Download failed for ${modelName}:`, error);
            
            updateTaskState(modelName, {
              status: 'error', 
              speed: 0,
              error: error.message || 'Unknown error',
            });
            
            // Show error notification
            toast({
              title: i18n.t('downloads.toast.downloadFailedTitle'),
              description: i18n.t('downloads.toast.downloadFailedMessage', { 
                modelName,
                error: error.message || 'Unknown error' 
              }),
              variant: 'destructive',
            });
          }
        } finally {
          // Only clean up controller if not paused
          const finalStatus = get().tasks[modelName]?.status;
          if (finalStatus !== 'paused') {
            console.log(`Cleaning up abort controller for ${modelName}, final status: ${finalStatus}`);
            get().abortControllers.delete(modelName);
            set(state => ({ abortControllers: new Map(state.abortControllers) }));
          }
        }
      },

      pauseDownload: (modelName, cleanup = false) => {
        // Get the abort controller
        const controller = get().abortControllers.get(modelName);
        const task = get().tasks[modelName];
        
        // Log the current state for debugging
        console.log(`Pausing download for ${modelName}, current status: ${task?.status}, controller exists: ${!!controller}, cleanup: ${cleanup}`);
        
        // Immediately update UI state to provide instant feedback
        if (task?.status !== 'paused') {
          updateTaskState(modelName, { 
            status: 'paused',
            speed: 0 
          });
        }
        
        if (controller) {
          try {
            // Abort frontend request
            console.log(`Sending abort signal for ${modelName}`);
            controller.abort();
          } catch (error) {
            console.error(`Error when aborting controller for ${modelName}:`, error);
          }
        }
        
        // Call backend cancel_pull command to ensure backend completely stops download stream
    // This call is asynchronous and does not block UI
        (async () => {
          console.log(`Calling backend cancel_pull for ${modelName} with cleanup=${cleanup}`);
          await ollamaTauriApi.cancelPull(modelName, cleanup);
          console.log(`Backend cancel_pull completed for ${modelName}`);
        })().catch(err => {
          console.error(`Error when calling cancel_pull for ${modelName}:`, err);
        });
            
        // Completely clean up controller instead of keeping aborted controller
    // This way a fresh request will be created when resuming
        get().abortControllers.delete(modelName);
        set(state => ({ abortControllers: new Map(state.abortControllers) }));
      },

      restartDownload: (modelName) => {
        const { tasks, clearTask, startDownload } = get();
        const task = tasks[modelName];

        if (!task) {
          console.warn(`Cannot restart a non-existent task: ${modelName}`);
          return;
        }

        console.log(`Restarting download for ${modelName}`);

        // 1. Clear the task completely, including backend progress
        clearTask(modelName, true); // Pass cleanup = true

        // 2. Start a fresh download after a short delay
        // The delay ensures that all cleanup operations have completed
        setTimeout(() => {
          console.log(`Starting fresh download for ${modelName} after restart.`);
          startDownload({
            name: modelName,
            size: 0 // Start with unknown size, as it's a fresh download
          });
        }, 100);
      },

      retryDownload: modelName => {
        const { startDownload, tasks } = get();
        const task = tasks[modelName];
        
        if (task) {
          console.log(`Attempting to retry/resume download for ${modelName}. Current status: ${task.status}`);
          
          // It's important to NOT set the status to 'downloading' here.
          // The startDownload function has the logic to handle resuming from a 'paused' state.
          // By letting startDownload manage the state transition, we avoid the race condition.

          startDownload({
            name: modelName, 
            size: task.total
          });
        } else {
          console.warn(`Cannot retry/resume a non-existent task: ${modelName}`);
        }
      },

      clearTask: (modelName, cleanup = false) => {
        // First pause download to prevent resource leaks
        get().pauseDownload(modelName, cleanup);
        
        // Then clear the task
        set(state => {
          const newTasks = { ...state.tasks };
          delete newTasks[modelName];
          return { tasks: newTasks };
        });
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
        const merged = { ...currentState, ...(persistedState as any) };

        // On rehydration, reset any in-progress downloads to a 'paused' state.
        // This prevents tasks from being stuck in a "downloading" state when the app restarts.
        if (merged.tasks) {
          for (const modelName in merged.tasks) {
            const task = merged.tasks[modelName];
            if (task.status === 'downloading' || task.status === 'pending' || task.status === 'finalizing') {
              merged.tasks[modelName] = {
                ...task,
                status: 'paused',
                speed: 0,
                remainingTime: Infinity,
                error: 'Download was interrupted by app restart.',
              };
            }
          }
        }
        
        // Ensure abortControllers is always a fresh Map on hydration.
        merged.abortControllers = new Map();
        return merged as DownloadState;
      },
    }
  )
);
