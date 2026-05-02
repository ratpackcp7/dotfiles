/**
 * CP7 Hooks Plugin for OpenCode
 * Based on ECC plugin, standardized for Chris Pack's homelab setup.
 * Profile: minimal (controlled via ECC_HOOK_PROFILE env var)
 * Disabled: stop:check-console-log, post:edit:console-warn, pre:write:doc-file-warning, post:bash:pr-created
 */

import type { PluginInput } from "@opencode-ai/plugin"
import * as fs from "fs"
import * as path from "path"
import {
  initStore,
  recordChange,
  clearChanges,
} from "./lib/changed-files-store.js"
import changedFilesTool from "../tools/changed-files.js"

type ECCHooksPluginFn = (input: PluginInput) => Promise<Record<string, unknown>>

export const ECCHooksPlugin: ECCHooksPluginFn = async ({
  client,
  $,
  directory,
  worktree,
}: PluginInput) => {
  type HookProfile = "minimal" | "standard" | "strict"

  const worktreePath = worktree || directory
  initStore(worktreePath)

  const editedFiles = new Set<string>()

  function resolvePath(p: string): string {
    if (path.isAbsolute(p)) return p
    return path.join(worktreePath, p)
  }

  function hasProjectFile(relativePath: string): boolean {
    try {
      return fs.existsSync(resolvePath(relativePath))
    } catch {
      return false
    }
  }

  const pendingToolChanges = new Map<string, { path: string; type: "added" | "modified" }>()
  let writeCounter = 0

  function getFilePath(args: Record<string, unknown> | undefined): string | null {
    if (!args) return null
    const p = (args.filePath ?? args.file_path ?? args.path) as string | undefined
    return typeof p === "string" && p.trim() ? p : null
  }

  const log = (level: "debug" | "info" | "warn" | "error", message: string) =>
    client.app.log({ body: { service: "cp7", level, message } })

  const normalizeProfile = (value: string | undefined): HookProfile => {
    if (value === "minimal" || value === "strict") return value
    return "standard"
  }

  const currentProfile = normalizeProfile(process.env.ECC_HOOK_PROFILE)
  const disabledHooks = new Set(
    (process.env.ECC_DISABLED_HOOKS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )

  const profileOrder: Record<HookProfile, number> = { minimal: 0, standard: 1, strict: 2 }

  const profileAllowed = (required: HookProfile | HookProfile[]): boolean => {
    if (Array.isArray(required)) {
      return required.some((entry) => profileOrder[currentProfile] >= profileOrder[entry])
    }
    return profileOrder[currentProfile] >= profileOrder[required]
  }

  const hookEnabled = (
    hookId: string,
    requiredProfile: HookProfile | HookProfile[] = "standard"
  ): boolean => {
    if (disabledHooks.has(hookId)) return false
    return profileAllowed(requiredProfile)
  }

  return {
    "file.edited": async (event: { path: string }) => {
      editedFiles.add(event.path)
      recordChange(event.path, "modified")

      // Auto-format (strict only)
      if (hookEnabled("post:edit:format", ["strict"]) && event.path.match(/\.(ts|tsx|js|jsx)$/)) {
        try {
          await $`prettier --write ${event.path} 2>/dev/null`
        } catch {}
      }
    },

    "tool.execute.after": async (
      input: { tool: string; callID?: string; args?: { filePath?: string; file_path?: string; path?: string } },
      output: unknown
    ) => {
      const filePath = getFilePath(input.args as Record<string, unknown>)
      if (input.tool === "edit" && filePath) {
        recordChange(filePath, "modified")
      }
      if (input.tool === "write" && filePath) {
        const key = input.callID ?? `write-${++writeCounter}-${filePath}`
        const pending = pendingToolChanges.get(key)
        if (pending) {
          recordChange(pending.path, pending.type)
          pendingToolChanges.delete(key)
        } else {
          recordChange(filePath, "modified")
        }
      }

      // TypeScript check (strict only)
      if (
        hookEnabled("post:edit:typecheck", ["strict"]) &&
        input.tool === "edit" &&
        input.args?.filePath?.match(/\.tsx?$/)
      ) {
        try {
          await $`npx tsc --noEmit 2>&1`
        } catch {}
      }
    },

    "tool.execute.before": async (
      input: { tool: string; callID?: string; args?: Record<string, unknown> }
    ) => {
      if (input.tool === "write") {
        const filePath = getFilePath(input.args)
        if (filePath) {
          const absPath = resolvePath(filePath)
          let type: "added" | "modified" = "modified"
          try {
            type = fs.existsSync(absPath) ? "modified" : "added"
          } catch {}
          const key = input.callID ?? `write-${++writeCounter}-${filePath}`
          pendingToolChanges.set(key, { path: filePath, type })
        }
      }

      // Git push reminder (strict only)
      if (
        hookEnabled("pre:bash:git-push-reminder", "strict") &&
        input.tool === "bash" &&
        input.args?.toString().includes("git push")
      ) {
        log("info", "[CP7] Review changes before pushing: git diff origin/main...HEAD")
      }

      // Long-running command reminder (strict only)
      if (hookEnabled("pre:bash:tmux-reminder", "strict") && input.tool === "bash") {
        const cmd = String(input.args?.command || input.args || "")
        if (cmd.match(/^(npm|pnpm|yarn|bun)\s+(install|build|test|run)/)) {
          log("info", "[CP7] Long-running command — consider tmux or background execution")
        }
      }
    },

    "session.created": async () => {
      if (!hookEnabled("session:start", ["minimal", "standard", "strict"])) return
      log("info", `[CP7] Session started in ${worktreePath}`)

      // Check for project context files
      if (hasProjectFile("AGENTS.md")) {
        log("info", "[CP7] Found AGENTS.md — project context available")
      }
      if (hasProjectFile("HANDOFF.md")) {
        log("info", "[CP7] Found HANDOFF.md — session state available")
      }
    },

    "session.idle": async () => {
      // Console audit disabled — not relevant for this stack
      editedFiles.clear()
    },

    "session.deleted": async () => {
      if (!hookEnabled("session:end-marker", ["minimal", "standard", "strict"])) return
      log("info", "[CP7] Session ended")
      editedFiles.clear()
      clearChanges()
      pendingToolChanges.clear()
    },

    "file.watcher.updated": async (event: { path: string; type: string }) => {
      let changeType: "added" | "modified" | "deleted" = "modified"
      if (event.type === "create" || event.type === "add") changeType = "added"
      else if (event.type === "delete" || event.type === "remove") changeType = "deleted"
      recordChange(event.path, changeType)
      if (event.type === "change") editedFiles.add(event.path)
    },

    "todo.updated": async (event: { todos: Array<{ text: string; done: boolean }> }) => {
      const completed = event.todos.filter((t) => t.done).length
      const total = event.todos.length
      if (total > 0) {
        log("info", `[CP7] Progress: ${completed}/${total} tasks`)
      }
    },

    "shell.env": async () => {
      const env: Record<string, string> = {
        PROJECT_ROOT: worktreePath,
      }

      const lockfiles: Record<string, string> = {
        "bun.lockb": "bun",
        "pnpm-lock.yaml": "pnpm",
        "yarn.lock": "yarn",
        "package-lock.json": "npm",
      }
      for (const [lockfile, pm] of Object.entries(lockfiles)) {
        if (hasProjectFile(lockfile)) { env.PACKAGE_MANAGER = pm; break }
      }

      const langDetectors: Record<string, string> = {
        "tsconfig.json": "typescript",
        "go.mod": "go",
        "pyproject.toml": "python",
        "Cargo.toml": "rust",
      }
      const detected: string[] = []
      for (const [file, lang] of Object.entries(langDetectors)) {
        if (hasProjectFile(file)) detected.push(lang)
      }
      if (detected.length > 0) {
        env.DETECTED_LANGUAGES = detected.join(",")
        env.PRIMARY_LANGUAGE = detected[0]
      }

      return env
    },

    "experimental.session.compacting": async () => {
      const contextBlock = [
        "# CP7 Session Context (preserve across compaction)",
        "",
        "## Stack",
        "- Server: acerserver (Ubuntu 24.04, Tailscale 100.101.249.113)",
        "- Domain: cp7.dev (Cloudflare tunnel, wildcard *.cp7.dev)",
        "- Projects: /home/chris/projects/ on acerserver",
        "- Tools: changed-files, run-tests, lint-check, format-code, git-summary, security-audit",
        "- Agents: planner, architect, code-reviewer, security-reviewer, tdd-guide, build-error-resolver",
        "",
        "## Conventions",
        "- Every project has AGENTS.md (orientation) + HANDOFF.md (session state)",
        "- Tests before implementation (TDD)",
        "- Spec first, then build",
        "",
      ]

      if (editedFiles.size > 0) {
        contextBlock.push("## Files Edited This Session")
        for (const f of editedFiles) contextBlock.push(`- ${f}`)
        contextBlock.push("")
      }

      return {
        context: contextBlock.join("\n"),
        compaction_prompt: "Preserve: 1) Current task and progress, 2) Key decisions made, 3) Files created/modified, 4) Remaining work, 5) Any blockers. Discard: verbose tool outputs, intermediate exploration, redundant file listings.",
      }
    },

    "permission.ask": async (event: { tool: string; args: unknown }) => {
      const cmd = String((event.args as Record<string, unknown>)?.command || event.args || "")

      if (["read", "glob", "grep", "search", "list"].includes(event.tool)) {
        return { approved: true, reason: "Read-only operation" }
      }
      if (event.tool === "bash" && /^(npx )?(prettier|biome|black|gofmt|rustfmt)/.test(cmd)) {
        return { approved: true, reason: "Formatter" }
      }
      if (event.tool === "bash" && /^(npm test|npx vitest|npx jest|pytest|go test|cargo test)/.test(cmd)) {
        return { approved: true, reason: "Test execution" }
      }

      return { approved: undefined }
    },

    tool: {
      "changed-files": changedFilesTool,
    },
  }
}

export default ECCHooksPlugin
