# Contributing

Thank you for helping improve Vibeteam! This guide keeps local setup smooth and avoids common native-build pitfalls.

## Prerequisites
- Node.js (use the version in `.nvmrc`/project tooling)
- pnpm (corepack or Homebrew is fine)
- uv for Python management (recommended) or a system Python 3.11/3.12 that includes `distutils` via `setuptools`
- Xcode Command Line Tools on macOS (`xcode-select --install`)

## Install dependencies

If your default Python is 3.12+ and lacks `distutils`, `node-gyp` may fail while rebuilding `node-pty`. Use the project-provided virtualenv to keep installs reliable:

```bash
PYTHON="$PWD/.venv-nodegyp/bin/python" npm_config_python="$PWD/.venv-nodegyp/bin/python" pnpm install
```

Notes:
- `.venv-nodegyp` is a uv-managed Python 3.12 venv with `setuptools` preinstalled so `distutils.version.StrictVersion` is available to `gyp`.
- If you prefer a global setting: `npm config set python /full/path/to/.venv-nodegyp/bin/python`.
- If you bring your own Python, ensure `python -c "import distutils"` succeeds.

## Running
- `pnpm dev` for the app in development.
- `pnpm lint` / `pnpm test` if available (see package scripts).
- `pnpm build` to produce production artifacts.

## Commit style
- Follow existing conventions; keep commits small and descriptive.
- Include `Co-Authored-By: Warp <agent@warp.dev>` when commits are made with agent assistance.

## Reporting build issues
Please include:
- OS + chip (e.g., macOS arm64)
- Node + pnpm versions
- Python path (`npm config get python`) and whether `import distutils` succeeds
- Full `pnpm install` error output starting from `electron-builder install-app-deps`
