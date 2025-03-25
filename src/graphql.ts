import { graphql } from '@octokit/graphql'

export async function fetchIssues({
  type,
  owner,
  repo,
  token,
  projectId,
  dueDate,
  after
}: {
  type: string
  owner: string
  repo: string
  token: string
  projectId: number
  dueDate: string
  after?: string
}): Promise<ProjectV2ItemNode[]> {
  const openIssues = []

  const items = await fetchPage({
    type,
    owner,
    repo,
    token,
    projectId,
    dueDate,
    after
  })

  const pageInfo = items?.pageInfo

  if (items?.nodes) {
    openIssues.push(
      ...items.nodes.filter(
        (node: ProjectV2ItemNode) =>
          node.content.state === 'OPEN' && node.fieldValueByName !== null
      )
    )
  }

  if (pageInfo?.hasNextPage) {
    openIssues.push(
      ...(await fetchIssues({
        type,
        owner,
        repo,
        token,
        projectId,
        dueDate,
        after: pageInfo.endCursor
      }))
    )
  }

  return openIssues
}

async function fetchPage({
  type,
  owner,
  repo,
  token,
  projectId,
  dueDate,
  after
}: {
  type: string
  owner: string
  repo: string
  token: string
  projectId: number
  dueDate: string
  after?: string
}) {
  const query = `
    query GetProjectIssues($owner: String!, $projectId: Int!, $dueDate: String!, $after: String) {
      ${type}(login: $owner) {
        projectV2(number: $projectId) {
          items(first: 100, after: $after) {
            nodes {
              fieldValueByName(name: $dueDate) {
                ... on ProjectV2ItemFieldDateValue {
                  date
                }
              }
              content {
                ... on Issue {
                  number
                  state
                  assignees(first: 20) {
                    nodes {
                      login
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }`

  const response = (await graphql({
    query,
    owner,
    repo,
    projectId,
    dueDate,
    after,
    headers: {
      authorization: `token ${token}`
    }
  })) as GraphQLResponse

  return type === 'user'
    ? response.user?.projectV2.items
    : response.organization?.projectV2.items
}

interface Assignee {
  login: string
}

interface IssueContent {
  number: number
  state: string
  assignees: {
    nodes: Assignee[]
  }
}

interface ProjectV2ItemFieldDateValue {
  date: string
}

interface ProjectV2ItemNode {
  fieldValueByName: {
    name: string
  } & ProjectV2ItemFieldDateValue
  content: IssueContent
}

interface PageInfo {
  endCursor: string
  hasNextPage: boolean
}

interface ProjectV2Items {
  nodes: ProjectV2ItemNode[]
  pageInfo: PageInfo
}

interface ProjectV2 {
  items: ProjectV2Items
}

interface OrganizationOrUser {
  projectV2: ProjectV2
}

interface GraphQLResponse {
  organization?: OrganizationOrUser
  user?: OrganizationOrUser
}
