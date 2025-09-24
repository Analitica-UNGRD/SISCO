This backups folder was created by an automated maintenance action on 2025-09-02.

Contents:
- src/pages-scripts/admin-original-backup.js  (full legacy admin monolith)
- src/pages/admin/admin-performance.js (moved performance monitor)
- src/pages/admin/admin-debug-panel.js (moved debug panel)
- src/pages/admin/admin-test-suite.js (moved test suite)

Purpose:
- Keep canonical copies of legacy/admin auxiliary files out of the active src tree.
- Originals in the main src tree were replaced with small shims that re-export the backed-up copies to preserve runtime imports.

Restore instructions:
- To restore a file, copy it back to the original path under src/ and remove the shim.
- Example: cp backups/moved-2025-09-02/src/pages/admin/admin-debug-panel.js src/pages/admin/admin-debug-panel.js

Notes:
- Files in this folder should not be edited in-place unless you intend to make them the canonical version. Instead, edit the original locations or coordinate with maintainers.
