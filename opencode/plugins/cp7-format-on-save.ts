import type { Plugin } from "@opencode-ai/plugin"

/**
 * CP7 Format on Save Plugin
 * 
 * Automatically formats code files when they are edited.
 * Supports: Prettier (JS/TS), Black (Python), rustfmt (Rust), gofmt (Go)
 * 
 * Installation:
 * 1. Copy to .opencode/plugins/cp7-format-on-save.ts
 * 2. Restart opencode
 * 3. Install formatters: npm i -g prettier, pip install black, etc.
 */

export const CP7FormatOnSave: Plugin = async ({ $, directory }) => {
  return {
    "file.edited": async (event) => {
      const filePath = event.filePath
      
      if (!filePath) return

      // Determine formatter based on extension
      const formatters: Record<string, string> = {
        ".js": "prettier --write",
        ".jsx": "prettier --write",
        ".ts": "prettier --write",
        ".tsx": "prettier --write",
        ".json": "prettier --write",
        ".md": "prettier --write",
        ".py": "black",
        ".rs": "rustfmt",
        ".go": "gofmt -w",
      }

      const ext = filePath.slice(filePath.lastIndexOf("."))
      const formatter = formatters[ext]

      if (!formatter) return

      // Check if formatter is available
      const formatterCmd = formatter.split(" ")[0]
      const whichResult = await $`which ${formatterCmd}`.quiet()
      
      if (whichResult.exitCode !== 0) {
        // Formatter not installed, skip silently
        return
      }

      // Run formatter
      console.log(`[CP7] Formatting ${filePath}...`)
      const formatResult = await $`${formatter} ${filePath}`.cwd(directory)
      
      if (formatResult.exitCode === 0) {
        console.log(`✅ [CP7] Formatted ${filePath}`)
      }
    },
  }
}
