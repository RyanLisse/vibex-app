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
import { useGitHubBranches } from "@/hooks/use-github-branches";

// Mock fetch
global.fetch = vi.fn();

// Mock the auth hook
<<<<<<< HEAD
vi.mock("./use-github-auth", () => ({
	useGitHubAuth: () => ({
		isAuthenticated: true,
		user: { login: "testuser" },
	}),
}));

describe("useGitHubBranches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with default state", () => {
		const { result } = renderHook(() => useGitHubBranches());

		expect(result.current.branches).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.currentRepository).toBeNull();
	});

	it("should fetch branches for a repository", async () => {
		const mockBranches = [
			{
				name: "main",
				commit: {
					sha: "abc123",
					url: "https://api.github.com/repos/testuser/repo1/commits/abc123",
				},
				protected: true,
			},
			{
				name: "develop",
				commit: {
					sha: "def456",
					url: "https://api.github.com/repos/testuser/repo1/commits/def456",
				},
				protected: false,
			},
			{
				name: "feature/new-feature",
				commit: {
					sha: "ghi789",
					url: "https://api.github.com/repos/testuser/repo1/commits/ghi789",
				},
				protected: false,
			},
		];

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockBranches,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		expect(result.current.branches).toEqual(mockBranches);
		expect(result.current.currentRepository).toBe("testuser/repo1");
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should handle fetch errors", async () => {
		(fetch as unknown as jest.Mock).mockRejectedValueOnce(
			new Error("Network error"),
		);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		expect(result.current.branches).toEqual([]);
		expect(result.current.error).toBe("Network error");
		expect(result.current.isLoading).toBe(false);
	});

	it("should get branch details", async () => {
		const mockBranchDetails = {
			name: "main",
			commit: {
				sha: "abc123",
				commit: {
					author: {
						name: "Test Author",
						email: "author@example.com",
						date: "2023-01-01T00:00:00Z",
					},
					message: "Initial commit",
				},
				url: "https://api.github.com/repos/testuser/repo1/commits/abc123",
			},
			protected: true,
			protection: {
				enabled: true,
				required_status_checks: {
					enforcement_level: "everyone",
					contexts: ["continuous-integration/travis-ci"],
				},
			},
		};

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockBranchDetails,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		const details = await act(async () => {
			return await result.current.getBranchDetails("testuser/repo1", "main");
		});

		expect(details).toEqual(mockBranchDetails);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining("/repos/testuser/repo1/branches/main"),
			expect.any(Object),
		);
	});

	it("should create a new branch", async () => {
		const mockNewBranch = {
			ref: "refs/heads/feature/new-feature",
			object: {
				sha: "abc123",
			},
		};

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockNewBranch,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		const newBranch = await act(async () => {
			return await result.current.createBranch(
				"testuser/repo1",
				"feature/new-feature",
				"abc123",
			);
		});

		expect(newBranch).toEqual(mockNewBranch);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining("/repos/testuser/repo1/git/refs"),
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					ref: "refs/heads/feature/new-feature",
					sha: "abc123",
				}),
			}),
		);
	});

	it("should delete a branch", async () => {
		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			status: 204,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.deleteBranch(
				"testuser/repo1",
				"feature/old-feature",
			);
		});

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(
				"/repos/testuser/repo1/git/refs/heads/feature/old-feature",
			),
			expect.objectContaining({
				method: "DELETE",
			}),
		);
	});

	it("should handle protected branch deletion error", async () => {
		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: false,
			status: 422,
			json: async () => ({
				message: "Branch is protected",
			}),
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await expect(
			act(async () => {
				await result.current.deleteBranch("testuser/repo1", "main");
			}),
		).rejects.toThrow("Branch is protected");
	});

	it("should compare branches", async () => {
		const mockComparison = {
			status: "ahead",
			ahead_by: 3,
			behind_by: 0,
			total_commits: 3,
			commits: [
				{
					sha: "commit1",
					commit: {
						message: "Feature commit 1",
					},
				},
				{
					sha: "commit2",
					commit: {
						message: "Feature commit 2",
					},
				},
				{
					sha: "commit3",
					commit: {
						message: "Feature commit 3",
					},
				},
			],
		};

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockComparison,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		const comparison = await act(async () => {
			return await result.current.compareBranches(
				"testuser/repo1",
				"main",
				"feature/new-feature",
			);
		});

		expect(comparison).toEqual(mockComparison);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(
				"/repos/testuser/repo1/compare/main...feature/new-feature",
			),
			expect.any(Object),
		);
	});

	it("should search branches by name", async () => {
		const allBranches = [
			{ name: "main" },
			{ name: "develop" },
			{ name: "feature/user-auth" },
			{ name: "feature/user-profile" },
			{ name: "bugfix/login-issue" },
		];

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => allBranches,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		act(() => {
			result.current.searchBranches("user");
		});

		expect(result.current.filteredBranches).toHaveLength(2);
		expect(result.current.filteredBranches[0].name).toBe("feature/user-auth");
		expect(result.current.filteredBranches[1].name).toBe(
			"feature/user-profile",
		);
	});

	it("should get default branch", async () => {
		const mockRepo = {
			default_branch: "main",
		};

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockRepo,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		const defaultBranch = await act(async () => {
			return await result.current.getDefaultBranch("testuser/repo1");
		});

		expect(defaultBranch).toBe("main");
	});

	it("should update branch protection", async () => {
		const mockProtection = {
			required_status_checks: {
				strict: true,
				contexts: ["continuous-integration/travis-ci"],
			},
			enforce_admins: true,
			required_pull_request_reviews: {
				required_approving_review_count: 2,
				dismiss_stale_reviews: true,
			},
			restrictions: null,
		};

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockProtection,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		const protection = await act(async () => {
			return await result.current.updateBranchProtection(
				"testuser/repo1",
				"main",
				{
					required_status_checks: {
						strict: true,
						contexts: ["continuous-integration/travis-ci"],
					},
					enforce_admins: true,
					required_pull_request_reviews: {
						required_approving_review_count: 2,
						dismiss_stale_reviews: true,
					},
				},
			);
		});

		expect(protection).toEqual(mockProtection);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining("/repos/testuser/repo1/branches/main/protection"),
			expect.objectContaining({
				method: "PUT",
			}),
		);
	});

	it("should handle pagination for branches", async () => {
		const mockPage1 = new Array(30).fill(null).map((_, i) => ({
			name: `branch-${i + 1}`,
			commit: { sha: `sha${i + 1}` },
		}));

		const mockPage2 = new Array(10).fill(null).map((_, i) => ({
			name: `branch-${i + 31}`,
			commit: { sha: `sha${i + 31}` },
		}));

		(fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					get: (name: string) =>
						name === "Link"
							? '<https://api.github.com/repos/testuser/repo1/branches?page=2>; rel="next"'
							: null,
				},
				json: async () => mockPage1,
			} as unknown)
			.mockResolvedValueOnce({
				ok: true,
				headers: {
					get: () => null,
				},
				json: async () => mockPage2,
			} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		expect(result.current.branches).toHaveLength(30);
		expect(result.current.hasMore).toBe(true);

		await act(async () => {
			await result.current.fetchMoreBranches();
		});

		expect(result.current.branches).toHaveLength(40);
		expect(result.current.hasMore).toBe(false);
	});

	it("should refresh branches", async () => {
		const mockBranches = [{ name: "main", commit: { sha: "abc123" } }];

		(fetch as unknown as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => mockBranches,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		expect(fetch).toHaveBeenCalledTimes(1);

		await act(async () => {
			await result.current.refreshBranches();
		});

		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it("should handle branch name validation", () => {
		const { result } = renderHook(() => useGitHubBranches());

		expect(result.current.isValidBranchName("feature/new-feature")).toBe(true);
		expect(result.current.isValidBranchName("feature new feature")).toBe(false);
		expect(result.current.isValidBranchName("feature..new")).toBe(false);
		expect(result.current.isValidBranchName("-feature")).toBe(false);
		expect(result.current.isValidBranchName("feature-")).toBe(false);
	});

	it("should handle authentication state", async () => {
		// Mock unauthenticated state
		mock.doMock("./use-github-auth", () => ({
			useGitHubAuth: () => ({
				isAuthenticated: false,
				user: null,
			}),
		}));

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		expect(result.current.error).toBe("Not authenticated");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("should group branches by type", async () => {
		const mockBranches = [
			{ name: "main" },
			{ name: "develop" },
			{ name: "feature/auth" },
			{ name: "feature/profile" },
			{ name: "bugfix/login" },
			{ name: "hotfix/security" },
			{ name: "release/v1.0" },
		];

		(fetch as unknown as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockBranches,
		} as unknown);

		const { result } = renderHook(() => useGitHubBranches());

		await act(async () => {
			await result.current.fetchBranches("testuser/repo1");
		});

		const grouped = result.current.groupedBranches;

		expect(grouped.main).toHaveLength(2);
		expect(grouped.feature).toHaveLength(2);
		expect(grouped.bugfix).toHaveLength(1);
		expect(grouped.hotfix).toHaveLength(1);
		expect(grouped.release).toHaveLength(1);
	});
});
=======
vi.mock('./use-github-auth', () => ({
  useGitHubAuth: () => ({
    isAuthenticated: true,
    user: { login: 'testuser' },
  }),
}))

describe('useGitHubBranches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGitHubBranches())

    expect(result.current.branches).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.currentRepository).toBeNull()
  })

  it('should fetch branches for a repository', async () => {
    const mockBranches = [
      {
        name: 'main',
        commit: {
          sha: 'abc123',
          url: 'https://api.github.com/repos/testuser/repo1/commits/abc123',
        },
        protected: true,
      },
      {
        name: 'develop',
        commit: {
          sha: 'def456',
          url: 'https://api.github.com/repos/testuser/repo1/commits/def456',
        },
        protected: false,
      },
      {
        name: 'feature/new-feature',
        commit: {
          sha: 'ghi789',
          url: 'https://api.github.com/repos/testuser/repo1/commits/ghi789',
        },
        protected: false,
      },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBranches,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    expect(result.current.branches).toEqual(mockBranches)
    expect(result.current.currentRepository).toBe('testuser/repo1')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    ;(fetch as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    expect(result.current.branches).toEqual([])
    expect(result.current.error).toBe('Network error')
    expect(result.current.isLoading).toBe(false)
  })

  it('should get branch details', async () => {
    const mockBranchDetails = {
      name: 'main',
      commit: {
        sha: 'abc123',
        commit: {
          author: {
            name: 'Test Author',
            email: 'author@example.com',
            date: '2023-01-01T00:00:00Z',
          },
          message: 'Initial commit',
        },
        url: 'https://api.github.com/repos/testuser/repo1/commits/abc123',
      },
      protected: true,
      protection: {
        enabled: true,
        required_status_checks: {
          enforcement_level: 'everyone',
          contexts: ['continuous-integration/travis-ci'],
        },
      },
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBranchDetails,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    const details = await act(async () => {
      return await result.current.getBranchDetails('testuser/repo1', 'main')
    })

    expect(details).toEqual(mockBranchDetails)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1/branches/main'),
      expect.any(Object)
    )
  })

  it('should create a new branch', async () => {
    const mockNewBranch = {
      ref: 'refs/heads/feature/new-feature',
      object: {
        sha: 'abc123',
      },
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewBranch,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    const newBranch = await act(async () => {
      return await result.current.createBranch('testuser/repo1', 'feature/new-feature', 'abc123')
    })

    expect(newBranch).toEqual(mockNewBranch)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1/git/refs'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ref: 'refs/heads/feature/new-feature',
          sha: 'abc123',
        }),
      })
    )
  })

  it('should delete a branch', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.deleteBranch('testuser/repo1', 'feature/old-feature')
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1/git/refs/heads/feature/old-feature'),
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('should handle protected branch deletion error', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        message: 'Branch is protected',
      }),
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await expect(
      act(async () => {
        await result.current.deleteBranch('testuser/repo1', 'main')
      })
    ).rejects.toThrow('Branch is protected')
  })

  it('should compare branches', async () => {
    const mockComparison = {
      status: 'ahead',
      ahead_by: 3,
      behind_by: 0,
      total_commits: 3,
      commits: [
        {
          sha: 'commit1',
          commit: {
            message: 'Feature commit 1',
          },
        },
        {
          sha: 'commit2',
          commit: {
            message: 'Feature commit 2',
          },
        },
        {
          sha: 'commit3',
          commit: {
            message: 'Feature commit 3',
          },
        },
      ],
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockComparison,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    const comparison = await act(async () => {
      return await result.current.compareBranches('testuser/repo1', 'main', 'feature/new-feature')
    })

    expect(comparison).toEqual(mockComparison)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1/compare/main...feature/new-feature'),
      expect.any(Object)
    )
  })

  it('should search branches by name', async () => {
    const allBranches = [
      { name: 'main' },
      { name: 'develop' },
      { name: 'feature/user-auth' },
      { name: 'feature/user-profile' },
      { name: 'bugfix/login-issue' },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => allBranches,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    act(() => {
      result.current.searchBranches('user')
    })

    expect(result.current.filteredBranches).toHaveLength(2)
    expect(result.current.filteredBranches[0].name).toBe('feature/user-auth')
    expect(result.current.filteredBranches[1].name).toBe('feature/user-profile')
  })

  it('should get default branch', async () => {
    const mockRepo = {
      default_branch: 'main',
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepo,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    const defaultBranch = await act(async () => {
      return await result.current.getDefaultBranch('testuser/repo1')
    })

    expect(defaultBranch).toBe('main')
  })

  it('should update branch protection', async () => {
    const mockProtection = {
      required_status_checks: {
        strict: true,
        contexts: ['continuous-integration/travis-ci'],
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 2,
        dismiss_stale_reviews: true,
      },
      restrictions: null,
    }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProtection,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    const protection = await act(async () => {
      return await result.current.updateBranchProtection('testuser/repo1', 'main', {
        required_status_checks: {
          strict: true,
          contexts: ['continuous-integration/travis-ci'],
        },
        enforce_admins: true,
        required_pull_request_reviews: {
          required_approving_review_count: 2,
          dismiss_stale_reviews: true,
        },
      })
    })

    expect(protection).toEqual(mockProtection)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/testuser/repo1/branches/main/protection'),
      expect.objectContaining({
        method: 'PUT',
      })
    )
  })

  it('should handle pagination for branches', async () => {
    const mockPage1 = new Array(30).fill(null).map((_, i) => ({
      name: `branch-${i + 1}`,
      commit: { sha: `sha${i + 1}` },
    }))

    const mockPage2 = new Array(10).fill(null).map((_, i) => ({
      name: `branch-${i + 31}`,
      commit: { sha: `sha${i + 31}` },
    }))

    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'Link'
              ? '<https://api.github.com/repos/testuser/repo1/branches?page=2>; rel="next"'
              : null,
        },
        json: async () => mockPage1,
      } as unknown)
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null,
        },
        json: async () => mockPage2,
      } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    expect(result.current.branches).toHaveLength(30)
    expect(result.current.hasMore).toBe(true)

    await act(async () => {
      await result.current.fetchMoreBranches()
    })

    expect(result.current.branches).toHaveLength(40)
    expect(result.current.hasMore).toBe(false)
  })

  it('should refresh branches', async () => {
    const mockBranches = [{ name: 'main', commit: { sha: 'abc123' } }]

    ;(fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockBranches,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refreshBranches()
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('should handle branch name validation', () => {
    const { result } = renderHook(() => useGitHubBranches())

    expect(result.current.isValidBranchName('feature/new-feature')).toBe(true)
    expect(result.current.isValidBranchName('feature new feature')).toBe(false)
    expect(result.current.isValidBranchName('feature..new')).toBe(false)
    expect(result.current.isValidBranchName('-feature')).toBe(false)
    expect(result.current.isValidBranchName('feature-')).toBe(false)
  })

  it('should handle authentication state', async () => {
    // Mock unauthenticated state
    mock.doMock('./use-github-auth', () => ({
      useGitHubAuth: () => ({
        isAuthenticated: false,
        user: null,
      }),
    }))

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    expect(result.current.error).toBe('Not authenticated')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should group branches by type', async () => {
    const mockBranches = [
      { name: 'main' },
      { name: 'develop' },
      { name: 'feature/auth' },
      { name: 'feature/profile' },
      { name: 'bugfix/login' },
      { name: 'hotfix/security' },
      { name: 'release/v1.0' },
    ]

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBranches,
    } as unknown)

    const { result } = renderHook(() => useGitHubBranches())

    await act(async () => {
      await result.current.fetchBranches('testuser/repo1')
    })

    const grouped = result.current.groupedBranches

    expect(grouped.main).toHaveLength(2)
    expect(grouped.feature).toHaveLength(2)
    expect(grouped.bugfix).toHaveLength(1)
    expect(grouped.hotfix).toHaveLength(1)
    expect(grouped.release).toHaveLength(1)
  })
})
>>>>>>> ryan-lisse/review-this-pr
