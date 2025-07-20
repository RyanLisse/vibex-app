import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useFileUpload } from "@/hooks/use-file-upload";

// Mock fetch
<<<<<<< HEAD
global.fetch = vi.fn();

describe("useFileUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with default state", () => {
		const { result } = renderHook(() => useFileUpload());

		expect(result.current.uploading).toBe(false);
		expect(result.current.progress).toBe(0);
		expect(result.current.error).toBeNull();
		expect(result.current.uploadedFiles).toEqual([]);
	});

	it("should handle single file upload successfully", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({
				id: "file-123",
				name: "test.pdf",
				url: "https://example.com/test.pdf",
				size: 1024,
			}),
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() => useFileUpload());
		const file = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.uploading).toBe(false);
		expect(result.current.progress).toBe(100);
		expect(result.current.error).toBeNull();
		expect(result.current.uploadedFiles).toHaveLength(1);
		expect(result.current.uploadedFiles[0]).toEqual({
			id: "file-123",
			name: "test.pdf",
			url: "https://example.com/test.pdf",
			size: 1024,
		});
	});

	it("should handle multiple file upload", async () => {
		const mockResponses = [
			{
				ok: true,
				json: async () => ({
					id: "file-1",
					name: "test1.pdf",
					url: "https://example.com/test1.pdf",
					size: 1024,
				}),
			},
			{
				ok: true,
				json: async () => ({
					id: "file-2",
					name: "test2.pdf",
					url: "https://example.com/test2.pdf",
					size: 2048,
				}),
			},
		];

		(fetch as unknown as jest.Mock)
			.mockResolvedValueOnce(mockResponses[0] as unknown)
			.mockResolvedValueOnce(mockResponses[1] as unknown);

		const { result } = renderHook(() => useFileUpload());
		const files = [
			new File(["content1"], "test1.pdf", { type: "application/pdf" }),
			new File(["content2"], "test2.pdf", { type: "application/pdf" }),
		];

		await act(async () => {
			await result.current.uploadFiles(files);
		});

		expect(result.current.uploadedFiles).toHaveLength(2);
		expect(result.current.error).toBeNull();
	});

	it("should track upload progress", async () => {
		const { result } = renderHook(() => useFileUpload());
		const progressUpdates: number[] = [];

		// Capture progress updates
		const originalSetProgress = result.current.setProgress;
		result.current.setProgress = (progress: number) => {
			progressUpdates.push(progress);
			originalSetProgress(progress);
		};

		const _file = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		// Simulate progress updates
		act(() => {
			result.current.setProgress(25);
			result.current.setProgress(50);
			result.current.setProgress(75);
			result.current.setProgress(100);
		});

		expect(progressUpdates).toEqual([25, 50, 75, 100]);
	});

	it("should handle upload errors", async () => {
		(fetch as unknown as jest.Mock).mockRejectedValueOnce(
			new Error("Network error"),
		);

		const { result } = renderHook(() => useFileUpload());
		const file = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.uploading).toBe(false);
		expect(result.current.error).toBe("Network error");
		expect(result.current.uploadedFiles).toHaveLength(0);
	});

	it("should handle HTTP error responses", async () => {
		const mockResponse = {
			ok: false,
			status: 413,
			statusText: "Payload Too Large",
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() => useFileUpload());
		const file = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.error).toBe("Upload failed: 413 Payload Too Large");
	});

	it("should validate file types", async () => {
		const { result } = renderHook(() =>
			useFileUpload({
				acceptedTypes: ["image/jpeg", "image/png"],
			}),
		);

		const invalidFile = new File(["test"], "test.pdf", {
			type: "application/pdf",
		});

		await act(async () => {
			await result.current.uploadFile(invalidFile);
		});

		expect(result.current.error).toBe("Invalid file type: application/pdf");
		expect(result.current.uploadedFiles).toHaveLength(0);
	});

	it("should validate file size", async () => {
		const { result } = renderHook(() =>
			useFileUpload({
				maxSize: 1024, // 1KB
			}),
		);

		const largeContent = "x".repeat(2048); // 2KB
		const largeFile = new File([largeContent], "large.txt", {
			type: "text/plain",
		});

		await act(async () => {
			await result.current.uploadFile(largeFile);
		});

		expect(result.current.error).toBe("File size exceeds limit: 2KB > 1KB");
	});

	it("should cancel upload", async () => {
		const { result } = renderHook(() => useFileUpload());

		act(() => {
			result.current.setUploading(true);
			result.current.setProgress(50);
		});

		expect(result.current.uploading).toBe(true);
		expect(result.current.progress).toBe(50);

		act(() => {
			result.current.cancelUpload();
		});

		expect(result.current.uploading).toBe(false);
		expect(result.current.progress).toBe(0);
		expect(result.current.error).toBe("Upload cancelled");
	});

	it("should clear uploaded files", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({
				id: "file-123",
				name: "test.pdf",
				url: "https://example.com/test.pdf",
				size: 1024,
			}),
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() => useFileUpload());
		const file = new File(["test content"], "test.pdf", {
			type: "application/pdf",
		});

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.uploadedFiles).toHaveLength(1);

		act(() => {
			result.current.clearFiles();
		});

		expect(result.current.uploadedFiles).toHaveLength(0);
	});

	it("should remove specific file", async () => {
		const mockResponses = [
			{
				ok: true,
				json: async () => ({
					id: "file-1",
					name: "test1.pdf",
					url: "https://example.com/test1.pdf",
					size: 1024,
				}),
			},
			{
				ok: true,
				json: async () => ({
					id: "file-2",
					name: "test2.pdf",
					url: "https://example.com/test2.pdf",
					size: 2048,
				}),
			},
		];

		(fetch as unknown as jest.Mock)
			.mockResolvedValueOnce(mockResponses[0] as unknown)
			.mockResolvedValueOnce(mockResponses[1] as unknown);

		const { result } = renderHook(() => useFileUpload());
		const files = [
			new File(["content1"], "test1.pdf", { type: "application/pdf" }),
			new File(["content2"], "test2.pdf", { type: "application/pdf" }),
		];

		await act(async () => {
			await result.current.uploadFiles(files);
		});

		expect(result.current.uploadedFiles).toHaveLength(2);

		act(() => {
			result.current.removeFile("file-1");
		});

		expect(result.current.uploadedFiles).toHaveLength(1);
		expect(result.current.uploadedFiles[0].id).toBe("file-2");
	});

	it("should handle drag and drop upload", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({
				id: "file-123",
				name: "dropped.jpg",
				url: "https://example.com/dropped.jpg",
				size: 2048,
			}),
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() => useFileUpload());

		const mockDataTransfer = {
			files: [new File(["image data"], "dropped.jpg", { type: "image/jpeg" })],
		};

		await act(async () => {
			await result.current.handleDrop(mockDataTransfer as any);
		});

		expect(result.current.uploadedFiles).toHaveLength(1);
		expect(result.current.uploadedFiles[0].name).toBe("dropped.jpg");
	});

	it("should handle upload with custom headers", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({
				id: "file-123",
				name: "test.pdf",
				url: "https://example.com/test.pdf",
			}),
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() =>
			useFileUpload({
				headers: {
					Authorization: "Bearer token123",
					"X-Custom-Header": "custom-value",
				},
			}),
		);

		const file = new File(["test"], "test.pdf", { type: "application/pdf" });

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer token123",
					"X-Custom-Header": "custom-value",
				}),
			}),
		);
	});

	it("should handle upload to custom endpoint", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({ id: "file-123" }),
		};
		(fetch as unknown as jest.Mock).mockResolvedValueOnce(
			mockResponse as unknown,
		);

		const { result } = renderHook(() =>
			useFileUpload({
				endpoint: "https://api.example.com/upload",
			}),
		);

		const file = new File(["test"], "test.pdf", { type: "application/pdf" });

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(fetch).toHaveBeenCalledWith(
			"https://api.example.com/upload",
			expect.any(Object),
		);
	});

	it("should handle concurrent uploads", async () => {
		const mockResponses = new Array(3).fill(null).map((_, i) => ({
			ok: true,
			json: async () => ({
				id: `file-${i}`,
				name: `test${i}.pdf`,
				url: `https://example.com/test${i}.pdf`,
			}),
		}));

		mockResponses.forEach((response) => {
			(fetch as unknown as jest.Mock).mockResolvedValueOnce(response as any);
		});

		const { result } = renderHook(() =>
			useFileUpload({
				maxConcurrent: 2,
			}),
		);

		const files = new Array(3).fill(null).map(
			(_, i) =>
				new File([`content${i}`], `test${i}.pdf`, {
					type: "application/pdf",
				}),
		);

		await act(async () => {
			await result.current.uploadFiles(files);
		});

		expect(result.current.uploadedFiles).toHaveLength(3);
		expect(result.current.currentConcurrent).toBe(0);
	});

	it("should reset error state", async () => {
		(fetch as unknown as jest.Mock).mockRejectedValueOnce(
			new Error("Network error"),
		);

		const { result } = renderHook(() => useFileUpload());
		const file = new File(["test"], "test.pdf", { type: "application/pdf" });

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.error).toBe("Network error");

		act(() => {
			result.current.resetError();
		});

		expect(result.current.error).toBeNull();
	});

	it("should handle upload retry", async () => {
		(fetch as unknown as jest.Mock)
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "file-123", name: "test.pdf" }),
			} as any);

		const { result } = renderHook(() =>
			useFileUpload({
				retryAttempts: 1,
			}),
		);

		const file = new File(["test"], "test.pdf", { type: "application/pdf" });

		await act(async () => {
			await result.current.uploadFile(file);
		});

		expect(result.current.error).toBeNull();
		expect(result.current.uploadedFiles).toHaveLength(1);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
=======
global.fetch = vi.fn()

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileUpload())

    expect(result.current.uploading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.uploadedFiles).toEqual([])
  })

  it('should handle single file upload successfully', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        id: 'file-123',
        name: 'test.pdf',
        url: 'https://example.com/test.pdf',
        size: 1024,
      }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploading).toBe(false)
    expect(result.current.progress).toBe(100)
    expect(result.current.error).toBeNull()
    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.uploadedFiles[0]).toEqual({
      id: 'file-123',
      name: 'test.pdf',
      url: 'https://example.com/test.pdf',
      size: 1024,
    })
  })

  it('should handle multiple file upload', async () => {
    const mockResponses = [
      {
        ok: true,
        json: async () => ({
          id: 'file-1',
          name: 'test1.pdf',
          url: 'https://example.com/test1.pdf',
          size: 1024,
        }),
      },
      {
        ok: true,
        json: async () => ({
          id: 'file-2',
          name: 'test2.pdf',
          url: 'https://example.com/test2.pdf',
          size: 2048,
        }),
      },
    ]

    ;(fetch as unknown as jest.Mock)
      .mockResolvedValueOnce(mockResponses[0] as unknown)
      .mockResolvedValueOnce(mockResponses[1] as unknown)

    const { result } = renderHook(() => useFileUpload())
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
    ]

    await act(async () => {
      await result.current.uploadFiles(files)
    })

    expect(result.current.uploadedFiles).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('should track upload progress', async () => {
    const { result } = renderHook(() => useFileUpload())
    const progressUpdates: number[] = []

    // Capture progress updates
    const originalSetProgress = result.current.setProgress
    result.current.setProgress = (progress: number) => {
      progressUpdates.push(progress)
      originalSetProgress(progress)
    }

    const _file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    // Simulate progress updates
    act(() => {
      result.current.setProgress(25)
      result.current.setProgress(50)
      result.current.setProgress(75)
      result.current.setProgress(100)
    })

    expect(progressUpdates).toEqual([25, 50, 75, 100])
  })

  it('should handle upload errors', async () => {
    ;(fetch as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploading).toBe(false)
    expect(result.current.error).toBe('Network error')
    expect(result.current.uploadedFiles).toHaveLength(0)
  })

  it('should handle HTTP error responses', async () => {
    const mockResponse = {
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.error).toBe('Upload failed: 413 Payload Too Large')
  })

  it('should validate file types', async () => {
    const { result } = renderHook(() =>
      useFileUpload({
        acceptedTypes: ['image/jpeg', 'image/png'],
      })
    )

    const invalidFile = new File(['test'], 'test.pdf', {
      type: 'application/pdf',
    })

    await act(async () => {
      await result.current.uploadFile(invalidFile)
    })

    expect(result.current.error).toBe('Invalid file type: application/pdf')
    expect(result.current.uploadedFiles).toHaveLength(0)
  })

  it('should validate file size', async () => {
    const { result } = renderHook(() =>
      useFileUpload({
        maxSize: 1024, // 1KB
      })
    )

    const largeContent = 'x'.repeat(2048) // 2KB
    const largeFile = new File([largeContent], 'large.txt', {
      type: 'text/plain',
    })

    await act(async () => {
      await result.current.uploadFile(largeFile)
    })

    expect(result.current.error).toBe('File size exceeds limit: 2KB > 1KB')
  })

  it('should cancel upload', async () => {
    const { result } = renderHook(() => useFileUpload())

    act(() => {
      result.current.setUploading(true)
      result.current.setProgress(50)
    })

    expect(result.current.uploading).toBe(true)
    expect(result.current.progress).toBe(50)

    act(() => {
      result.current.cancelUpload()
    })

    expect(result.current.uploading).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBe('Upload cancelled')
  })

  it('should clear uploaded files', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        id: 'file-123',
        name: 'test.pdf',
        url: 'https://example.com/test.pdf',
        size: 1024,
      }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploadedFiles).toHaveLength(1)

    act(() => {
      result.current.clearFiles()
    })

    expect(result.current.uploadedFiles).toHaveLength(0)
  })

  it('should remove specific file', async () => {
    const mockResponses = [
      {
        ok: true,
        json: async () => ({
          id: 'file-1',
          name: 'test1.pdf',
          url: 'https://example.com/test1.pdf',
          size: 1024,
        }),
      },
      {
        ok: true,
        json: async () => ({
          id: 'file-2',
          name: 'test2.pdf',
          url: 'https://example.com/test2.pdf',
          size: 2048,
        }),
      },
    ]

    ;(fetch as unknown as jest.Mock)
      .mockResolvedValueOnce(mockResponses[0] as unknown)
      .mockResolvedValueOnce(mockResponses[1] as unknown)

    const { result } = renderHook(() => useFileUpload())
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
    ]

    await act(async () => {
      await result.current.uploadFiles(files)
    })

    expect(result.current.uploadedFiles).toHaveLength(2)

    act(() => {
      result.current.removeFile('file-1')
    })

    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.uploadedFiles[0].id).toBe('file-2')
  })

  it('should handle drag and drop upload', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        id: 'file-123',
        name: 'dropped.jpg',
        url: 'https://example.com/dropped.jpg',
        size: 2048,
      }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() => useFileUpload())

    const mockDataTransfer = {
      files: [new File(['image data'], 'dropped.jpg', { type: 'image/jpeg' })],
    }

    await act(async () => {
      await result.current.handleDrop(mockDataTransfer as any)
    })

    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(result.current.uploadedFiles[0].name).toBe('dropped.jpg')
  })

  it('should handle upload with custom headers', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        id: 'file-123',
        name: 'test.pdf',
        url: 'https://example.com/test.pdf',
      }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() =>
      useFileUpload({
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      })
    )

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        }),
      })
    )
  })

  it('should handle upload to custom endpoint', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ id: 'file-123' }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse as unknown)

    const { result } = renderHook(() =>
      useFileUpload({
        endpoint: 'https://api.example.com/upload',
      })
    )

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/upload', expect.any(Object))
  })

  it('should handle concurrent uploads', async () => {
    const mockResponses = new Array(3).fill(null).map((_, i) => ({
      ok: true,
      json: async () => ({
        id: `file-${i}`,
        name: `test${i}.pdf`,
        url: `https://example.com/test${i}.pdf`,
      }),
    }))

    mockResponses.forEach((response) => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(response as any)
    })

    const { result } = renderHook(() =>
      useFileUpload({
        maxConcurrent: 2,
      })
    )

    const files = new Array(3).fill(null).map(
      (_, i) =>
        new File([`content${i}`], `test${i}.pdf`, {
          type: 'application/pdf',
        })
    )

    await act(async () => {
      await result.current.uploadFiles(files)
    })

    expect(result.current.uploadedFiles).toHaveLength(3)
    expect(result.current.currentConcurrent).toBe(0)
  })

  it('should reset error state', async () => {
    ;(fetch as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.error).toBe('Network error')

    act(() => {
      result.current.resetError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle upload retry', async () => {
    ;(fetch as unknown as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'file-123', name: 'test.pdf' }),
      } as any)

    const { result } = renderHook(() =>
      useFileUpload({
        retryAttempts: 1,
      })
    )

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.uploadedFiles).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
>>>>>>> ryan-lisse/review-this-pr
