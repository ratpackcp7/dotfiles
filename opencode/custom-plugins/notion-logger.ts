import type { Plugin } from "@opencode-ai/plugin"

const NOTION_TOKEN = process.env.NOTION_TOKEN ?? ""
const NOTION_DB_ID = "69d03f87c84040078dc5de55fab40daa"
const NOTION_API = "https://api.notion.com/v1"

const VALID_AGENTS = [
  "build", "planner", "architect", "code-reviewer", "security-reviewer",
  "tdd-guide", "build-error-resolver", "e2e-runner", "refactor-cleaner",
  "doc-updater", "other"
]

const ERROR_PATTERNS = [
  /error:/i, /FAILED/i, /exception/i, /exit code [1-9]/i,
  /cannot find/i, /TypeError/i, /SyntaxError/i,
  /Build failed/i, /ENOENT/i, /npm ERR/i,
]

interface SessionState {
  notionPageId: string | null
  filesModified: Set<string>
  agentsUsed: Set<string>
  errors: string[]
}

const sessions = new Map<string, SessionState>()

function getState(sessionId: string): SessionState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { notionPageId: null, filesModified: new Set(), agentsUsed: new Set(), errors: [] })
  }
  return sessions.get(sessionId)!
}

async function notionRequest(method: string, path: string, body?: object) {
  try {
    const res = await fetch(`${NOTION_API}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json() as Record<string, unknown>
    return res.ok ? json : null
  } catch {
    return null
  }
}

async function createSessionRow(project: string): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0]
  const title = `${today} â€” ${project} (via opencode)`
  const result = await notionRequest("POST", "/pages", {
    parent: { database_id: NOTION_DB_ID },
    properties: {
      "Session": { title: [{ text: { content: title } }] },
      "Date": { date: { start: today } },
      "Project": { rich_text: [{ text: { content: project } }] },
      "Status": { select: { name: "Partial" } },
    },
  })
  return (result?.id as string) ?? null
}

async function updateRow(pageId: string, state: SessionState, status: string) {
  const files = [...state.filesModified].join(", ")
  const agents = [...state.agentsUsed].filter(a => VALID_AGENTS.includes(a))
  const errors = state.errors.slice(0, 10).join("\n---\n")
  const properties: Record<string, unknown> = {
    "Status": { select: { name: status } },
    "Files Changed": { rich_text: [{ text: { content: files || "none" } }] },
  }
  if (agents.length > 0) properties["Agents Used"] = { multi_select: agents.map(name => ({ name })) }
  if (errors) properties["Errors"] = { rich_text: [{ text: { content: errors.substring(0, 2000) } }] }
  await notionRequest("PATCH", `/pages/${pageId}`, { properties })
}

export const NotionLoggerPlugin: Plugin = async ({ directory }) => {
  const project = (directory ?? "unknown").replace(/\\/g, "/").split("/").pop() ?? "unknown"

  return {
    event: async ({ event }: { event: Record<string, unknown> }) => {
      const props = event.properties as Record<string, unknown> | undefined
      const sessionId = props?.sessionID as string | undefined
      if (!sessionId) return

      if (event.type === "session.created") {
        const state = getState(sessionId)
        state.notionPageId = await createSessionRow(project)
      }

      if (event.type === "session.idle") {
        const state = sessions.get(sessionId)
        if (state?.notionPageId) await updateRow(state.notionPageId, state, "Partial")
      }

      if (event.type === "session.deleted") {
        const state = sessions.get(sessionId)
        if (state?.notionPageId) {
          await updateRow(state.notionPageId, state, "Complete")
          sessions.delete(sessionId)
        }
      }
    },

    "tool.execute.after": async (input: { tool: string; sessionID: string; args?: unknown }, result: unknown) => {
      const state = sessions.get(input.sessionID)
      if (!state) return
      const tool = input.tool
      const args = input.args as Record<string, unknown> | undefined
      const output = (result as Record<string, unknown>)?.output ?? ""
      const outputStr = typeof output === "string" ? output : JSON.stringify(output)

      if (["write", "edit", "apply_patch"].includes(tool)) {
        const filePath = ((args?.filePath ?? args?.path) as string) ?? ""
        const fileName = filePath.replace(/\\/g, "/").split("/").pop()
        if (fileName) state.filesModified.add(fileName)
      }

      if (["bash", "edit", "write"].includes(tool) && outputStr.length < 3000) {
        if (ERROR_PATTERNS.some(p => p.test(outputStr))) {
          const entry = `[${tool}] ${outputStr.replace(/\n+/g, " ").trim().substring(0, 300)}`
          if (!state.errors.includes(entry)) state.errors.push(entry)
        }
      }

      const agentMatch = tool.match(/^(planner|architect|code-reviewer|security-reviewer|tdd-guide|build-error-resolver|e2e-runner|refactor-cleaner|doc-updater)$/)
      if (agentMatch) state.agentsUsed.add(agentMatch[1])
    },
  }
}

export default NotionLoggerPlugin

