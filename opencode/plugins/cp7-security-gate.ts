import type { Plugin } from "@opencode-ai/plugin"

/**
 * CP7 Security Gate Plugin
 * 
 * Enforces security checks before commits and file writes.
 * Blocks commits with hardcoded secrets and warns about security issues.
 * 
 * Installation:
 * 1. Copy to .opencode/plugins/cp7-security-gate.ts
 * 2. Restart opencode
 */

export const CP7SecurityGate: Plugin = async ({ $, directory }) => {
  // Patterns that indicate secrets
  const secretPatterns = [
    { pattern: /password\s*=\s*["'][^"']{8,}["']/i, name: "password" },
    { pattern: /api_key\s*=\s*["'][^"']{20,}["']/i, name: "api_key" },
    { pattern: /secret\s*=\s*["'][^"']{20,}["']/i, name: "secret" },
    { pattern: /token\s*=\s*["'][^"']{20,}["']/i, name: "token" },
    { pattern: /sk-[a-zA-Z0-9_-]{20,}/, name: "OpenAI API key" },
    { pattern: /AKIA[0-9A-Z]{16}/, name: "AWS access key" },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: "GitHub personal token" },
    { pattern: /glpat-[a-zA-Z0-9\-]{20}/, name: "GitLab token" },
  ]

  // Patterns that indicate SQL injection risk
  const sqlInjectionPatterns = [
    /execute\s*\(\s*["'].*\+/,  // String concatenation in SQL
    /query\s*\(\s*[`"'].*\$\{/,  // Template literals in SQL
    /raw\s*\(\s*["'].*\+/,       // Raw SQL with concatenation
  ]

  return {
    // Check files before writing
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "write" && input.tool !== "edit") {
        return
      }

      const filePath = input.args.filePath || ""
      const content = input.args.content || input.args.newString || ""

      // Skip check for non-code files
      if (!/\.(py|js|ts|jsx|tsx|go|rs|java|rb|php)$/i.test(filePath)) {
        return
      }

      // Check for secrets
      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          console.warn(`⚠️  [CP7 Security] Potential ${name} detected in ${filePath}`)
          console.warn("   Use environment variables instead: process.env.VAR_NAME")
          // Don't block, just warn — let pre-push gate block the commit
        }
      }

      // Check for SQL injection risks
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(content)) {
          console.warn(`⚠️  [CP7 Security] Potential SQL injection in ${filePath}`)
          console.warn("   Use parameterized queries instead of string concatenation")
        }
      }

      // Check for console.log in production code
      const isTestFile = /\.(test|spec)\./i.test(filePath)
      if (/console\.log\(/.test(content) && !isTestFile) {
        console.warn(`⚠️  [CP7] console.log found in ${filePath}`)
        console.warn("   Remove debug logging before committing")
      }
    },

    // Check git commits
    "command.executed": async (event) => {
      if (!event.command?.includes("git commit")) {
        return
      }

      console.log("[CP7] Security gate checking commit...")

      // Check staged files for secrets
      const result = await $`git diff --cached`.cwd(directory).quiet()
      const diff = result.stdout.toString()

      let blocked = false

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(diff)) {
          console.error(`❌ [CP7 Security] BLOCKED: ${name} detected in commit`)
          blocked = true
        }
      }

      if (blocked) {
        console.error("\nRemove secrets and use environment variables.")
        console.error("Example: const apiKey = process.env.API_KEY")
        throw new Error("Commit blocked: secrets detected")
      }

      console.log("✅ [CP7] Security check passed")
    },
  }
}
