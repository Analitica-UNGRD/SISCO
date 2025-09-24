FILES_DOCUMENTATION for Seguimiento_contratistas

This document contains a per-file summary and notes intended to help
maintainability and follow best practices. Per the user's request, README.md
files are intentionally excluded from the repo (they are present locally but
will be ignored by .gitignore).

Top-level files and purpose:

- package.json
  - Contains project metadata and npm scripts used for development.
  - Scripts of interest:
    - "start": runs the proxy and static server concurrently for dev.
    - "proxy": runs `node server.js` (the local proxy server).
  - Keep `package-lock.json` to ensure reproducible installs.

- server.js
  - A small Express proxy server used in development to forward requests to
    a Google Apps Script endpoint. It includes a simple CORS middleware and
    an in-memory rate limiter.
  - Important: This server is only for development. Do not use as production
    middleware without adding authentication and hardened CORS rules.

- start-servers.ps1
  - Convenience script for Windows developers. Starts the proxy (npm run proxy)
    in a separate PowerShell window and then starts `npx http-server` to serve
    static files on port 5500. It waits until each service reports healthy.
  - It now checks for `node` and `npm` in PATH and prints instructions if missing.

- Restart-Server.ps1
  - Stops running Node processes (by process name) and restarts the proxy.
  - Use with care: stopping all Node processes may affect unrelated apps.

- public/ and src/
  - `src/` contains the source HTML/JS pages used in development. `public/`
    holds helper scripts such as `api-proxy.js` and offline helpers.

- apps_script/
  - Google Apps Script source files used by the backend (deployed in Apps Script).

- scripts/
  - Helper PowerShell scripts used for checks and environment setup.

General notes and best practices:

- Node/npm: developers should install Node LTS and ensure `node` and `npm` are
  available in PATH. Use `nvm`/`nvm-windows` to manage multiple Node versions.

- Secrets: Never commit secrets or credentials. Files like `.env` and keys are
  already ignored in `.gitignore`.

- Git history: The user requested a single initial commit on the remote. The
  following steps show how to re-initialize git locally (erasing history) and
  perform a single commit named "Version 1.0 Primera implementacion SISCO".

Commands to create a single-commit repository (run locally in project root):

  # WARNING: This will remove any existing .git history. Ensure you have a
  # backup if you need the previous commits.
  rm -rf .git
  git init
  git add .
  git commit -m "Version 1.0 Primera implementacion SISCO"
  git branch -M main
  # Create a remote repo in GitHub (manually) then add origin and push:
  git remote add origin https://github.com/<your-user>/<your-repo>.git
  git push -u origin main

Deploying to Vercel:

- After pushing to GitHub, create a new project in Vercel and link the GitHub
  repository. Vercel will detect the project (static site / Node) and allow
  configuration of build & environment variables.

- If the project is a static frontend (served by `http-server`), you can
  configure Vercel to serve the `src/` or `public/` folder as the output.

End of FILES_DOCUMENTATION.md
