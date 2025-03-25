export function buildBodyMarkdown({
  template,
  assignee,
  date
}: {
  template: string
  assignee: string
  date: string
}): string {
  const handle: string = assignee.startsWith('@') ? assignee : `@${assignee}`
  return template.replace(/{assignee}/g, handle).replace(/{date}/g, date)
}
