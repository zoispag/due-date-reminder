import * as core from '@actions/core'
import github from '@actions/github'
import { fetchIssues } from './graphql.js'
import { buildBodyMarkdown } from './body.js'
import { isTomorrow } from 'date-fns'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token: string = core.getInput('gh_token')
    const projectId: number = parseInt(core.getInput('project_id'), 10)
    const dueDate: string = core.getInput('due_date_field_name') || 'Due date'
    const type: string = core.getInput('owner_type') || 'organization'
    if (type !== 'organization' && type !== 'user') {
      throw new Error(
        `Invalid owner_type: ${type}. Must be 'organization' or 'user'.`
      )
    }
    const owner: string = github.context.repo.owner
    const repo: string = github.context.repo.repo
    const template: string = core.getInput('template')
    const fallbackAssignee: string = core.getInput('fallback_assignee') || owner

    const issues = await fetchIssues({
      type,
      owner,
      repo,
      token,
      projectId,
      dueDate
    })

    core.info(
      `Found ${issues.length} issues. Checking if they are due tomorrow...`
    )

    core.debug(JSON.stringify(issues))

    const octokit = github.getOctokit(token)
    for (const issue of issues) {
      // Check if the date is not tomorrow
      if (!isTomorrow(new Date(issue.fieldValueByName.date))) {
        core.info(`Issue ${issue.content.number} is not due tomorrow`)
        continue
      }

      // add a comment to the issue
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.content.number,
        body: buildBodyMarkdown({
          template,
          assignee: issue.content.assignees.nodes[0]?.login || fallbackAssignee,
          date: issue.fieldValueByName?.date || ''
        })
      })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
