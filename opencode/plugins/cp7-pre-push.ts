import type { Plugin } from "@opencode-ai/plugin"

/**
 * CP7 Pre-Push Test Gate
 * 
 * Automatically runs tests before allowing git push.
 * Blocks push if tests fail or documentation is stale.
 * 
 * Installation:
 * 1. Copy to .opencode/plugins/cp7-pre-push.ts
 * 2. Restart opencode
 */

export const CP7PrePush: Plugin = async ({ $, directory }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // Only intercept git push commands
      if (input.tool !== "bash" || !input.args.command?.includes("git push")) {
        return
      }

      console.log("[CP7] Pre-push gate activated...")

      // Check if this is a CP7 project
      const hasCP7 = await Bun.file(`${directory}/.cp7`).exists()
      const hasTests = await Bun.file(`${directory}/tests`).exists() || 
                       await Bun.file(`${directory}/test`).exists()

      if (!hasCP7 && !hasTests) {
        return // Not a CP7 project, allow push
      }

      // Gate 1: Run pre-push tests if they exist
      const prePushScript = `${directory}/.pre-push-test.sh`
      if (await Bun.file(prePushScript).exists()) {
        console.log("[CP7] Running pre-push tests...")
        const result = await $`bash ${prePushScript}`.cwd(directory)
        
        if (result.exitCode !== 0) {
          throw new Error(
            "❌ PUSH BLOCKED: Pre-push tests failed.\n" +
            "Fix tests before pushing.\n" +
            "Run: bash .pre-push-test.sh"
          )
        }
      }

      // Gate 2: Check for documentation drift if close.py exists
      const closeScript = `${directory}/close.py`
      if (await Bun.file(closeScript).exists()) {
        console.log("[CP7] Checking documentation...")
        const result = await $`python3 ${closeScript} --validate-only`.cwd(directory).quiet()
        
        if (result.exitCode !== 0) {
          throw new Error(
            "❌ PUSH BLOCKED: Documentation drift detected.\n" +
            "Run: python3 close.py \"What shipped this session\"\n" +
            "Then retry push."
          )
        }
      }

      // Gate 3: Check for secrets in changed files
      const diffResult = await $`git diff --cached --name-only`.cwd(directory).quiet()
      const changedFiles = diffResult.stdout.toString().trim().split("\n")
      
      for (const file of changedFiles) {
        if (!file) continue
        
        // Check for common secret patterns
        const content = await $`git diff --cached ${file}`.cwd(directory).quiet()
        const diff = content.stdout.toString()
        
        const secretPatterns = [
          /password\s*=\s*["'][^"']{8,}["']/i,
          /api_key\s*=\s*["'][^"']{20,}["']/i,
          /secret\s*=\s*["'][^"']{20,}["']/i,
          /token\s*=\s*["'][^"']{20,}["']/i,
          /sk-[a-zA-Z0-9_-]{20,}/,  // OpenAI keys
          /AKIA[0-9A-Z]{16}/,      // AWS keys
        ]
        
        for (const pattern of secretPatterns) {
          if (pattern.test(diff)) {
            throw new Error(
              `❌ PUSH BLOCKED: Potential secret in ${file}\n` +
              "Remove secrets and use environment variables.\n" +
              "See: .env.template for proper secret handling."
            )
          }
        }
      }

      console.log("✅ [CP7] All gates passed. Push allowed.")
    },
  }
}
