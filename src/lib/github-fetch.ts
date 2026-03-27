/**
 * Fetches raw file content from the taveclose-source/kairos-logos GitHub repo.
 * Uses GITHUB_PAT env var for authentication.
 */

const REPO = 'taveclose-source/kairos-logos'
const BRANCH = 'master'

export async function fetchFileFromGitHub(filePath: string): Promise<string | null> {
  const token = process.env.GITHUB_PAT
  if (!token) {
    console.warn('[github-fetch] GITHUB_PAT not configured — skipping file fetch')
    return null
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/src/${filePath}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.warn(`[github-fetch] Failed to fetch ${filePath}: ${res.status}`)
      return null
    }
    return await res.text()
  } catch (e) {
    console.warn(`[github-fetch] Error fetching ${filePath}:`, e)
    return null
  }
}

export async function fetchMultipleFiles(filePaths: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const fetches = filePaths.map(async (fp) => {
    const content = await fetchFileFromGitHub(fp)
    if (content) results[fp] = content
  })
  await Promise.allSettled(fetches)
  return results
}
