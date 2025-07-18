import { type NextRequest, NextResponse } from 'next/server'
import { githubAuth } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    // Get the access token from the httpOnly cookie
    const accessToken = request.cookies.get('github_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch repositories
    const repositories = await githubAuth.getUserRepositories(accessToken)

    // Filter to only include repositories the user has push access to
    const userRepos = repositories.filter(
      (repo) =>
        !repo.fork && // Exclude forks
        repo.permissions?.push !== false // Only repos with push access
    )

    return NextResponse.json({
      repositories: userRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
      })),
    })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}
