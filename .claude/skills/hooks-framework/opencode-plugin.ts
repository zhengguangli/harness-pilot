import type { Plugin } from "@opencode-ai/plugin"

export const HarnessHooks: Plugin = async ({ $, directory }) => {
  const scripts = `${directory}/.claude/skills/hooks-framework/scripts`

  return {
    "session.created": async () => {
      try { await $`node ${scripts}/context-check.mjs`.quiet() } catch {}
      try { await $`node ${scripts}/env-verify.mjs`.quiet() } catch {}
    },

    "file.edited": async () => {
      try {
        await $`node ${scripts}/lint-check.mjs`.quiet()
      } catch (e: any) {
        console.error(`[harness-hooks] lint-check 失败: ${e.message}`)
      }
    },

    "experimental.session.compacting": async (_input: any, output: any) => {
      try {
        const result = await $`node ${scripts}/compaction.mjs`.text()
        if (result) output.context.push(result)
      } catch {}
    },

    "session.idle": async () => {
      try { await $`node ${scripts}/trace-log.mjs`.quiet() } catch {}
      try { await $`node ${scripts}/quality-metric.mjs`.quiet() } catch {}
    },
  }
}
