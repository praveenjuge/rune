import { EventEmitter } from 'node:events';
import { BrowserWindow } from 'electron';
import { ollamaManager } from './manager';
import {
  getImagesNeedingTags,
  setImageTagStatus,
  updateImageTags,
} from '../db';
import {
  type LibraryImage,
  type TaggingQueueStatus,
  type ImageTagsUpdated,
  IPC_EVENTS,
} from '../../shared/library';

const BATCH_SIZE = 5;
const PROCESS_INTERVAL = 1000; // 1 second between images

class TaggingQueue extends EventEmitter {
  private isProcessing = false;
  private isPaused = false;
  private libraryPath: string | null = null;
  private currentImageId: string | null = null;
  private processedCount = 0;
  private failedCount = 0;
  private processTimeout: NodeJS.Timeout | null = null;

  setLibraryPath(libraryPath: string): void {
    this.libraryPath = libraryPath;
  }

  getStatus(): TaggingQueueStatus {
    return {
      isProcessing: this.isProcessing,
      pending: 0, // Will be updated by caller
      completed: this.processedCount,
      failed: this.failedCount,
      currentImageId: this.currentImageId,
    };
  }

  async start(): Promise<void> {
    if (!this.libraryPath) {
      console.warn('[tagging-queue] No library path set');
      return;
    }

    // Check if Ollama is ready
    const status = await ollamaManager.checkStatus();
    if (!status.modelInstalled) {
      console.info('[tagging-queue] Model not installed, skipping');
      return;
    }

    this.isPaused = false;
    this.scheduleNextProcess();
  }

  pause(): void {
    this.isPaused = true;
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
      this.processTimeout = null;
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.scheduleNextProcess();
    }
  }

  private scheduleNextProcess(): void {
    if (this.isPaused || this.isProcessing) return;
    
    this.processTimeout = setTimeout(() => {
      this.processNext();
    }, PROCESS_INTERVAL);
  }

  private async processNext(): Promise<void> {
    if (!this.libraryPath || this.isPaused || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get images that need tagging
      const images = await getImagesNeedingTags(this.libraryPath, BATCH_SIZE);
      
      if (images.length === 0) {
        console.info('[tagging-queue] No images pending');
        this.isProcessing = false;
        return;
      }

      for (const image of images) {
        if (this.isPaused) break;
        
        await this.processImage(image);
      }

      // Schedule next batch if not paused
      if (!this.isPaused) {
        this.scheduleNextProcess();
      }
    } catch (error) {
      console.error('[tagging-queue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processImage(image: LibraryImage): Promise<void> {
    if (!this.libraryPath) return;

    this.currentImageId = image.id;

    try {
      // Mark as generating
      await setImageTagStatus(this.libraryPath, image.id, 'generating');
      this.broadcastTagUpdate({
        id: image.id,
        aiTags: null,
        aiTagStatus: 'generating',
      });

      // Generate tags
      const tags = await ollamaManager.generateTags(image.filePath);

      // Update database
      await updateImageTags(this.libraryPath, image.id, tags, 'complete');
      this.processedCount++;

      // Broadcast update
      this.broadcastTagUpdate({
        id: image.id,
        aiTags: tags,
        aiTagStatus: 'complete',
      });

      console.info(`[tagging-queue] Tagged image ${image.id}: ${tags}`);
    } catch (error) {
      console.error(`[tagging-queue] Failed to tag image ${image.id}:`, error);
      
      if (this.libraryPath) {
        await updateImageTags(this.libraryPath, image.id, null, 'failed');
      }
      this.failedCount++;

      this.broadcastTagUpdate({
        id: image.id,
        aiTags: null,
        aiTagStatus: 'failed',
      });
    } finally {
      this.currentImageId = null;
    }
  }

  async retryImage(imageId: string): Promise<void> {
    if (!this.libraryPath) return;

    await setImageTagStatus(this.libraryPath, imageId, 'pending');
    this.broadcastTagUpdate({
      id: imageId,
      aiTags: null,
      aiTagStatus: 'pending',
    });

    // Trigger processing if not already running
    if (!this.isProcessing && !this.isPaused) {
      this.scheduleNextProcess();
    }
  }

  private broadcastTagUpdate(update: ImageTagsUpdated): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(IPC_EVENTS.imageTagsUpdated, update);
    }
  }

  async enqueueNewImages(_imageIds: string[]): Promise<void> {
    // Images are already in 'pending' status from insertion
    // Just trigger processing if not running
    if (!this.isProcessing && !this.isPaused && this.libraryPath) {
      const status = await ollamaManager.checkStatus();
      if (status.modelInstalled) {
        this.scheduleNextProcess();
      }
    }
  }
}

export const taggingQueue = new TaggingQueue();
