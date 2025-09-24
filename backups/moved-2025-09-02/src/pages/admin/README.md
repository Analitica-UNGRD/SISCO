Local backups of admin helper scripts moved on 2025-09-02.

Files:
- admin-performance.js: Performance monitor that instruments adminManager and records metrics.
- admin-debug-panel.js: UI debug panel that shows tests, performance, and system info.
- admin-test-suite.js: Automated admin tests; not autorun by default.

How to restore:
- Copy the desired file back to `src/pages/admin/` and remove the shim file created at the original path.

Why moved:
- These files are auxiliary tools used for debugging and testing. They were consolidated into a backups folder to keep the active codepath clean while preserving history.

Do not delete these files unless you are certain they are no longer useful.
