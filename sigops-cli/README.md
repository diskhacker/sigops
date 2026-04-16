# SigOps CLI — Task Registry

> Register, run, and track your automation scripts. No agents. No DAGs. No complexity.

## Why

You keep writing Node.js scripts for one-off tasks — fixing MongoDB templates, running Terraform, processing CSVs. Each time you forget the arguments, the env vars, which script does what. SigOps CLI wraps your existing scripts in a simple YAML definition so every task is registered, parameterized, and tracked.

```bash
# Before (every time you run it, you forget the flags)
MONGO_URI=mongodb://... node scripts/fix-html-templates.js --csv=batch3.csv --collection=email_templates --dry-run=true --output=./output

# After
sigops run fix-email-templates --csv_path=batch3.csv
```

## Install

```bash
npm install -g @sigops/cli

# Or run directly
npx @sigops/cli init
```

## Quick Start

```bash
# 1. Initialize in your project
sigops init

# 2. Register a task
sigops add fix-templates --run "node {{script}} --csv={{csv_path}}" --script ./scripts/fix.js

# 3. Edit the YAML to add your inputs
#    .sigops/tasks/fix-templates.yaml

# 4. Run it
sigops run fix-templates --csv_path=./data.csv

# 5. Check history
sigops history
```

## Commands

| Command | Description |
|---------|-------------|
| `sigops init` | Initialize `.sigops/` in current directory |
| `sigops add <name>` | Scaffold a new task YAML |
| `sigops run <task> [--inputs]` | Execute a task |
| `sigops list` | List all tasks (alias: `ls`) |
| `sigops inspect <task>` | Show task details + usage |
| `sigops history [task]` | Show execution history |
| `sigops remove <task>` | Delete a task (alias: `rm`) |

## Task Definition (YAML)

```yaml
name: fix-email-templates
description: Fix broken HTML in MongoDB email templates
version: 1.0.0
script: ./scripts/fix-html-templates.js

inputs:
  csv_path:
    type: file            # string | number | boolean | file | select
    required: true
    description: CSV with template IDs

  mongo_uri:
    type: string
    default: "${MONGO_URI}"   # Resolved from environment
    secret: true              # Masked in history

  dry_run:
    type: boolean
    default: true

  target:
    type: select
    options: [dev, staging, production]

# {{variables}} are replaced with input values
run: "node {{script}} --csv={{csv_path}} --uri={{mongo_uri}} --dry-run={{dry_run}}"

timeout: 600              # seconds (default: 300)
cwd: ./my-project         # working directory (default: cwd)

env:                      # extra env vars
  NODE_ENV: production

tags: [mongodb, production]   # for sigops list --tag
```

## Features

**Input Types:** `string`, `number`, `boolean`, `file`, `select` (with options list)

**Defaults:** Static values or `${ENV_VAR}` references resolved from `.env` or environment

**Secrets:** Inputs marked `secret: true` are masked as `***` in history records

**Dry Run:** `sigops run <task> --dry-run` shows the resolved command without executing

**History:** JSON-backed execution log with status, duration, exit codes, and output capture

**Tags:** Filter tasks with `sigops list --tag <tag>`

**JSON Output:** `sigops history --json` and `sigops inspect <task> --json` for scripting

**Timeout:** Per-task configurable. Sends SIGTERM then SIGKILL after 5s grace.

## Directory Structure

```
your-project/
├── .sigops/
│   ├── config.json        # Registry settings
│   ├── tasks/             # Task YAML files
│   │   ├── fix-templates.yaml
│   │   └── deploy-infra.yaml
│   ├── history.json       # Execution log (gitignored)
│   └── .gitignore
├── scripts/
│   └── fix-html-templates.js
└── .env                   # Env vars for ${} resolution
```

## Tips

**Use .env for secrets:**
```bash
# .env
MONGO_URI=mongodb://user:pass@host:27017/db
PROXMOX_API_URL=https://proxmox.local:8006/api2/json
```

**Chain commands in run:**
```yaml
run: "cd {{project_dir}} && npm install && npm run build && npm test"
```

**Use with any language:**
```yaml
run: "python3 {{script}} --input={{file}}"
run: "bash {{script}} {{arg1}} {{arg2}}"
run: "pwsh {{script}} -Csv {{csv_path}}"
```

**Pipe output:**
```bash
sigops history --json | jq '.[] | select(.status == "failed")'
```

## License

MIT — ClusterAssets Innovation Pvt. Ltd.
