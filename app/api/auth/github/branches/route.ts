import { NextRequest, NextResponse } from 'next/server'

interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export async function GET(request: NextRequest) {
  try {
    // Get the access token from the httpOnly cookie
    const accessToken = request.cookies.get('github_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get repository from query parameters
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo parameters are required' }, { status: 400 })
    }

    // First fetch repository info to get the default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
      }
      throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`)
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch

    // Fetch branches from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
      }
      throw new Error(`Failed to fetch branches: ${response.statusText}`)
    }

    const branches: GitHubBranch[] = await response.json()

    return NextResponse.json({
      branches: branches.map((branch: GitHubBranch) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected || false,
        isDefault: branch.name === defaultBranch,
      })),
    })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}
