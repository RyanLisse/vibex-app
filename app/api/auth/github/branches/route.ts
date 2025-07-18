import { type NextRequest, NextResponse } from 'next/server'

interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

// Helper functions for validation and API calls
const validateAuth = (accessToken: string | undefined): NextResponse | null => {
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return null
}

const validateParams = (owner: string | null, repo: string | null): NextResponse | null => {
  if (!(owner && repo)) {
    return NextResponse.json({ error: 'Owner and repo parameters are required' }, { status: 400 })
  }
  return null
}

const createGitHubHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  Accept: 'application/vnd.github.v3+json',
})

const handleGitHubError = (response: Response): NextResponse | null => {
  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }
    throw new Error(`GitHub API error: ${response.statusText}`)
  }
  return null
}

const fetchRepoInfo = async (owner: string, repo: string, accessToken: string) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: createGitHubHeaders(accessToken),
  })

  const errorResponse = handleGitHubError(response)
  if (errorResponse) throw errorResponse

  return response.json()
}

const fetchBranches = async (owner: string, repo: string, accessToken: string) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
    headers: createGitHubHeaders(accessToken),
  })

  const errorResponse = handleGitHubError(response)
  if (errorResponse) throw errorResponse

  return response.json()
}

const formatBranches = (branches: GitHubBranch[], defaultBranch: string) => {
  return branches.map((branch: GitHubBranch) => ({
    name: branch.name,
    commit: {
      sha: branch.commit.sha,
      url: branch.commit.url,
    },
    protected: branch.protected,
    isDefault: branch.name === defaultBranch,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('github_access_token')?.value
    const authError = validateAuth(accessToken)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const paramsError = validateParams(owner, repo)
    if (paramsError) return paramsError

    const repoData = await fetchRepoInfo(owner!, repo!, accessToken!)
    const defaultBranch = repoData.default_branch

    const branches: GitHubBranch[] = await fetchBranches(owner!, repo!, accessToken!)
    const formattedBranches = formatBranches(branches, defaultBranch)

    return NextResponse.json({ branches: formattedBranches })
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Error fetching branches:', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}
