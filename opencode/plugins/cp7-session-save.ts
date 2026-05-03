import type { Plugin } from "@opencode-ai/plugin"

/**
 * CP7 Session Save Plugin
 * 
 * Automatically saves session state to .cp7/sessions/ when opencode goes idle
 * or when a session is compacted. This ensures no work is lost between sessions.
 * 
 * Installation:
 * 1. Copy to .opencode/plugins/cp7-session-save.ts
 * 2. Restart opencode
 * 
 * Requires: cp7-toolkit/scripts/cp7-save.py or cp7-compile.py
 */

export const CP7SessionSave: Plugin = async ({ $, directory }) => {
  return {
    // Auto-save when session goes idle (user stops interacting)
    "session.idle": async () => {
      const cp7Dir = `${directory}/.cp7`
      
      // Check if this is a CP7 project
      if (!await Bun.file(`${cp7Dir}/sessions`).exists()) {
        return
      }

      console.log("[CP7] Session idle detected — saving state...")
      
      let saveSuccessful = false
      
      try {
        // Try to run cp7-save.py if available
        const saveScript = `${process.env.HOME}/cp7-toolkit/scripts/cp7-save.py`
        const result = await $`python3 ${saveScript} ${directory}`.quiet()
        
        if (result.exitCode === 0) {
          console.log("[CP7] Session saved successfully")
          saveSuccessful = true
        }
      } catch {
        // Script not available or failed
      }
      
      // Fallback: create a simple session file
      if (!saveSuccessful) {
        const today = new Date().toISOString().split('T')[0]
        const sessionFile = `${cp7Dir}/sessions/${today}-auto.md`
        
        await Bun.write(sessionFile, `# Auto-saved Session (${today})

## Summary
Session auto-saved on idle.

## Next Steps
- Continue from where you left off
`)
        
        console.log(`[CP7] Created auto-save session: ${sessionFile}`)
      }
    },

    // Also save when session is compacted (context window full)
    "session.compacted": async () => {
      const cp7Dir = `${directory}/.cp7`
      
      if (!await Bun.file(`${cp7Dir}/sessions`).exists()) {
        return
      }

      console.log("[CP7] Session compacted — checkpoint saved")
      
      // Just create a checkpoint marker
      const today = new Date().toISOString().split('T')[0]
      const checkpointFile = `${cp7Dir}/sessions/${today}-compaction.md`
      
      await Bun.write(checkpointFile, `# Compaction Checkpoint (${today})

## Summary
Context was compacted. Review .cp7/playbook.md for full state.

## Next Steps
- Load playbook: cat .cp7/playbook.md
- Check current state: cat .cp7/current-state.json
`)
    },
  }
}
