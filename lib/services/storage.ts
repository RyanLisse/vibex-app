/**
 * Cloud Storage Service
 *
 * Provides unified interface for file storage using Vercel Blob.
 * Handles uploads for voice recordings, screenshots, and task attachments.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { del, head, list, put } from "@vercel/blob";
import { observability } from "@/lib/observability";

export interface StorageUploadOptions {
	contentType?: string;
	metadata?: Record<string, string>;
	access?: "public" | "private";
}

export interface StorageFile {
	url: string;
	pathname: string;
	size: number;
	uploadedAt: Date;
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface StorageListOptions {
	prefix?: string;
	limit?: number;
	cursor?: string;
}

export class StorageService {
	private tracer = trace.getTracer("storage-service");

	/**
	 * Upload a file to cloud storage
	 */
	async upload(
		file: File | Blob,
		path: string,
		options?: StorageUploadOptions
	): Promise<StorageFile> {
		const span = this.tracer.startSpan("storage.upload");

		try {
			span.setAttributes({
				"storage.path": path,
				"storage.size": file.size,
				"storage.type": file.type || options?.contentType || "application/octet-stream",
				"storage.access": options?.access || "public",
			});

			// Upload to Vercel Blob
			const blob = await put(path, file, {
				access: options?.access || "public",
				contentType: file.type || options?.contentType,
				// @ts-ignore - metadata is supported in the latest version
				metadata: options?.metadata,
			});

			// Record metrics
			observability.metrics.customMetric.record(file.size, {
				metric_name: "storage_upload_size",
				unit: "bytes",
				category: "storage",
			});

			observability.metrics.customMetric.record(1, {
				metric_name: "storage_upload_count",
				unit: "count",
				category: "storage",
			});

			span.setStatus({ code: SpanStatusCode.OK });

			return {
				url: blob.url,
				pathname: blob.pathname,
				size: blob.size,
				uploadedAt: new Date(blob.uploadedAt),
				contentType: blob.contentType,
				// @ts-ignore - metadata is supported in the latest version
				metadata: blob.metadata,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			observability.metrics.errorRate.record(1, {
				error_type: "storage_upload_error",
				component: "storage",
			});

			throw new Error(`Failed to upload file: ${(error as Error).message}`);
		} finally {
			span.end();
		}
	}

	/**
	 * Upload audio file for voice tasks
	 */
	async uploadAudio(audioFile: File | Blob, taskId: string): Promise<string> {
		const span = this.tracer.startSpan("storage.uploadAudio");

		try {
			const extension =
				audioFile instanceof File ? audioFile.name.split(".").pop() || "webm" : "webm";

			const path = `voice-recordings/${taskId}/${Date.now()}.${extension}`;

			const result = await this.upload(audioFile, path, {
				contentType: audioFile.type || "audio/webm",
				metadata: {
					taskId,
					type: "voice_recording",
					uploadedAt: new Date().toISOString(),
				},
				access: "public",
			});

			return result.url;
		} finally {
			span.end();
		}
	}

	/**
	 * Upload screenshot for bug reports
	 */
	async uploadScreenshot(
		screenshotFile: File | Blob,
		taskId: string,
		annotations?: any[]
	): Promise<string> {
		const span = this.tracer.startSpan("storage.uploadScreenshot");

		try {
			const path = `screenshots/${taskId}/${Date.now()}.png`;

			const result = await this.upload(screenshotFile, path, {
				contentType: "image/png",
				metadata: {
					taskId,
					type: "screenshot",
					hasAnnotations: annotations && annotations.length > 0 ? "true" : "false",
					annotationCount: String(annotations?.length || 0),
					uploadedAt: new Date().toISOString(),
				},
				access: "public",
			});

			// If there are annotations, store them separately
			if (annotations && annotations.length > 0) {
				const annotationsBlob = new Blob([JSON.stringify(annotations)], {
					type: "application/json",
				});

				await this.upload(annotationsBlob, `screenshots/${taskId}/${Date.now()}-annotations.json`, {
					contentType: "application/json",
					metadata: {
						taskId,
						type: "screenshot_annotations",
						screenshotUrl: result.url,
					},
					access: "public",
				});
			}

			return result.url;
		} finally {
			span.end();
		}
	}

	/**
	 * Upload task attachment
	 */
	async uploadAttachment(file: File, taskId: string, attachmentType: string): Promise<StorageFile> {
		const span = this.tracer.startSpan("storage.uploadAttachment");

		try {
			const path = `attachments/${taskId}/${Date.now()}-${file.name}`;

			const result = await this.upload(file, path, {
				contentType: file.type,
				metadata: {
					taskId,
					type: attachmentType,
					originalName: file.name,
					uploadedAt: new Date().toISOString(),
				},
				access: "public",
			});

			return result;
		} finally {
			span.end();
		}
	}

	/**
	 * Delete a file from storage
	 */
	async delete(url: string): Promise<void> {
		const span = this.tracer.startSpan("storage.delete");

		try {
			span.setAttribute("storage.url", url);

			await del(url);

			observability.metrics.customMetric.record(1, {
				metric_name: "storage_delete_count",
				unit: "count",
				category: "storage",
			});

			span.setStatus({ code: SpanStatusCode.OK });
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			observability.metrics.errorRate.record(1, {
				error_type: "storage_delete_error",
				component: "storage",
			});

			throw new Error(`Failed to delete file: ${(error as Error).message}`);
		} finally {
			span.end();
		}
	}

	/**
	 * List files in storage
	 */
	async list(options?: StorageListOptions): Promise<{
		files: StorageFile[];
		cursor?: string;
		hasMore: boolean;
	}> {
		const span = this.tracer.startSpan("storage.list");

		try {
			span.setAttributes({
				"storage.prefix": options?.prefix || "",
				"storage.limit": options?.limit || 1000,
			});

			const result = await list({
				prefix: options?.prefix,
				limit: options?.limit || 1000,
				cursor: options?.cursor,
			});

			const files: StorageFile[] = result.blobs.map((blob) => ({
				url: blob.url,
				pathname: blob.pathname,
				size: blob.size,
				uploadedAt: new Date(blob.uploadedAt),
				contentType: blob.contentType,
				// @ts-ignore - metadata is supported in the latest version
				metadata: blob.metadata,
			}));

			return {
				files,
				cursor: result.cursor,
				hasMore: result.hasMore,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			throw new Error(`Failed to list files: ${(error as Error).message}`);
		} finally {
			span.end();
		}
	}

	/**
	 * Get file metadata
	 */
	async getMetadata(url: string): Promise<StorageFile | null> {
		const span = this.tracer.startSpan("storage.getMetadata");

		try {
			span.setAttribute("storage.url", url);

			const metadata = await head(url);

			if (!metadata) {
				return null;
			}

			return {
				url: metadata.url,
				pathname: metadata.pathname,
				size: metadata.size,
				uploadedAt: new Date(metadata.uploadedAt),
				contentType: metadata.contentType,
				// @ts-ignore - metadata is supported in the latest version
				metadata: metadata.metadata,
			};
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			return null;
		} finally {
			span.end();
		}
	}
}

// Export singleton instance
export const storageService = new StorageService();
