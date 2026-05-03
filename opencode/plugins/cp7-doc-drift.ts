/**
 * CP7 Document Drift Detector
 * 
 * Prevents document drift by tracking file changes and comparing against docs.
 * 
 * What it does:
 * 1. Watches file edits and logs them to .cp7/changes.log
 * 2. On session start: checks if docs reflect recent changes
 * 3. On session idle: prompts to update HANDOFF.md if changes exist
 * 
 * Installation:
 * 1. Copy to .opencode/plugins/cp7-doc-drift.ts
 * 2. Restart opencode
 */

import type { Plugin } from "@opencode-ai/plugin"

interface ChangeEntry {
  timestamp: string
  file: string
  action: 'created' | 'modified' | 'deleted'
}

export const CP7DocDrift: Plugin = async ({ $, directory }) => {
  const cp7Dir = `${directory}/.cp7`
  const changesLog = `${cp7Dir}/changes.log`
  const lastSessionFile = `${cp7Dir}/last-session.json`

  // Load last session state
  let lastSession = { timestamp: '', commit: '', filesChanged: 0 }
  try {
    const data = await Bun.file(lastSessionFile).text()
    lastSession = JSON.parse(data)
  } catch {
    // No previous session
  }

  return {
    // On session start: check for drift
    "session.created": async () => {
      // Check if this is a CP7 project
      if (!await Bun.file(`${cp7Dir}/playbook.md`).exists()) {
        return
      }

      console.log("[CP7] Checking for document drift...")

      // Get current git state
      const gitResult = await $`git log -1 --format=%H`.cwd(directory).quiet()
      const currentCommit = gitResult.stdout.toString().trim()

      if (lastSession.commit && lastSession.commit !== currentCommit) {
        // There have been commits since last session
        const diffResult = await $`git log --oneline ${lastSession.commit}..HEAD`.cwd(directory).quiet()
        const commits = diffResult.stdout.toString().trim().split('\n').filter(Boolean)
        
        if (commits.length > 0) {
          console.warn(`⚠️  [CP7] Document drift detected!`)
          console.warn(`   ${commits.length} commits since last session:`)
          commits.forEach(c => console.warn(`   - ${c}`))
          console.warn(`\n   Last session: ${lastSession.timestamp}`)
          console.warn(`   Check: cat .cp7/HANDOFF.md`)
          console.warn(`   Update: echo "What shipped" >> .cp7/HANDOFF.md`)
          
          // Also check if changes.log exists and has entries
          try {
            const changes = await Bun.file(changesLog).text()
            const lines = changes.trim().split('\n').filter(Boolean)
            if (lines.length > 0) {
              console.warn(`\n   Unlogged changes: ${lines.length} file edits`)
            }
          } catch {
            // No changes log
          }
        }
      } else {
        console.log("✅ [CP7] No document drift detected")
      }
    },

    // Watch file edits during session
    "file.edited": async (event) => {
      const filePath = event.filePath
      if (!filePath || !filePath.startsWith(directory)) return
      
      // Skip non-code files and hidden files
      if (filePath.includes('/.') || filePath.includes('\\.')) return
      if (!/\.(py|js|ts|jsx|tsx|go|rs|java|rb|php|md|json|yaml|yml)$/i.test(filePath)) return

      const relativePath = filePath.replace(directory, '').replace(/^[/\\]/, '')
      const timestamp = new Date().toISOString()
      const entry = `[${timestamp}] MODIFIED: ${relativePath}\n`

      try {
        // Append to changes log (create if doesn't exist)
        const existing = await Bun.file(changesLog).text().catch(() => '')
        await Bun.write(changesLog, existing + entry)
      } catch {
        // Silently fail - not critical
      }
    },

    // On session idle: check if we should update docs
    "session.idle": async () => {
      if (!await Bun.file(`${cp7Dir}/playbook.md`).exists()) {
        return
      }

      try {
        const changes = await Bun.file(changesLog).text()
        const lines = changes.trim().split('\n').filter(Boolean)
        
        if (lines.length > 10) {
          console.log(`\n⚠️  [CP7] ${lines.length} file changes this session.`)
          console.log("   Consider updating HANDOFF.md before ending session.")
          console.log("   Run: echo 'Shipped: [summary]' >> .cp7/HANDOFF.md")
        }
      } catch {
        // No changes to report
      }
    },

    // On session end: save session state
    "session.ended": async () => {
      if (!await Bun.file(`${cp7Dir}/playbook.md`).exists()) {
        return
      }

      try {
        const gitResult = await $`git log -1 --format=%H`.cwd(directory).quiet()
        const currentCommit = gitResult.stdout.toString().trim()
        
        const session = {
          timestamp: new Date().toISOString(),
          commit: currentCommit,
          filesChanged: 0
        }

        try {
          const changes = await Bun.file(changesLog).text()
          session.filesChanged = changes.trim().split('\n').filter(Boolean).length
        } catch {
          // No changes log
        }

        await Bun.write(lastSessionFile, JSON.stringify(session, null, 2))
        
        // Clear changes log for next session
        await Bun.write(changesLog, '')
        
        console.log(`[CP7] Session state saved (${session.filesChanged} changes tracked)`)
      } catch {
        // Silently fail
      }
    }
  }
}