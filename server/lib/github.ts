import { Integration } from "@shared/schema";

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastUpdated: Date;
}

interface GitHubCommit {
  id: string;
  message: string;
  author: string;
  date: Date;
  url: string;
}

interface GitHubPullRequest {
  id: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

interface GitHubIssue {
  id: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: Date;
  updatedAt: Date;
  url: string;
  labels: string[];
}

function getGithubToken(): string | undefined {
  return (
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_PAT ||
    process.env.GITHUB_SHITTYBOT_TOKEN
  );
}

function githubHeaders(): Record<string, string> {
  const token = getGithubToken();
  const base = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ChittyFinance/1.0' };
  return token ? { ...base, 'Authorization': `Bearer ${token}` } : base;
}

export async function fetchUserRepositories(integration: Integration): Promise<GitHubRepository[]> {
  try {
    if (!getGithubToken()) {
      throw new Error("GitHub token not available");
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    
    return data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      lastUpdated: new Date(repo.updated_at)
    }));
  } catch (error: any) {
    console.error("Error fetching GitHub repositories:", error.message);
    return [];
  }
}

export async function fetchRepositoryCommits(integration: Integration, repoFullName: string): Promise<GitHubCommit[]> {
  try {
    if (!getGithubToken()) {
      throw new Error("GitHub token not available");
    }

    const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=5`, {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    
    return data.map((commit: any) => ({
      id: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: new Date(commit.commit.author.date),
      url: commit.html_url
    }));
  } catch (error: any) {
    console.error(`Error fetching commits for ${repoFullName}:`, error.message);
    return [];
  }
}

export async function fetchRepositoryPullRequests(integration: Integration, repoFullName: string): Promise<GitHubPullRequest[]> {
  try {
    if (!getGithubToken()) {
      throw new Error("GitHub token not available");
    }

    const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=5`, {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    
    return data.map((pr: any) => ({
      id: pr.id,
      title: pr.title,
      state: pr.merged_at ? 'merged' : pr.state,
      author: pr.user.login,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      url: pr.html_url
    }));
  } catch (error: any) {
    console.error(`Error fetching pull requests for ${repoFullName}:`, error.message);
    return [];
  }
}

export async function fetchRepositoryIssues(integration: Integration, repoFullName: string): Promise<GitHubIssue[]> {
  try {
    if (!getGithubToken()) {
      throw new Error("GitHub token not available");
    }

    const response = await fetch(`https://api.github.com/repos/${repoFullName}/issues?state=all&per_page=5`, {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    
    return data
      .filter((issue: any) => !issue.pull_request) // Filter out pull requests
      .map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        state: issue.state,
        author: issue.user.login,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        url: issue.html_url,
        labels: issue.labels.map((label: any) => label.name)
      }));
  } catch (error: any) {
    console.error(`Error fetching issues for ${repoFullName}:`, error.message);
    return [];
  }
}

// Export types
export type { GitHubRepository, GitHubCommit, GitHubPullRequest, GitHubIssue };
