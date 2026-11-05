<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Seguimiento por rama

Con cada requerimiento nuevo, antes de cambiar nada:

1. Comprueba la rama actual con `git branch --show-current`.
2. Abre `docs/<rama>/Following.md`, por ejemplo `docs/feature/interface-changes/Following.md`. Si no existe, créalo. `docs/` es local y no se versiona.
3. Actualízalo con cada cambio, hasta cerrar la rama.

**`Following.md`** es una guía concisa y fácil de entender, no un informe largo:

- Las funcionalidades que se están tratando, con una breve explicación.
- Una zona de tareas relacionadas con los commits: `- T01: Add visibility account: archivos que cambiaron y lógica implementada.`
- Los cambios importantes, mencionados de forma explícita.
- Si un cambio altera una tarea anterior de la rama, se actualiza esa tarea.

**Commits:** cada tarea va en su propio commit, solo después de que el usuario la apruebe, con el formato `TXX: Short comment in English`. `XX` es el número de la tarea en esa rama. No añadas la línea `Co-Authored-By`.
