# Kestra Notes

notes from [kestra.io/docs](https://kestra.io/docs/)

---

## Core Concepts

**Flow** = YAML workflow definition with `id`, `namespace`, `tasks`

**Namespace** = logical grouping (like folders). Can share secrets, KV, files

**Execution** = single run of a flow. Has unique ID, inputs, outputs, state

---

## Triggers

```yaml
triggers:
  - id: daily
    type: io.kestra.plugin.core.trigger.Schedule
    cron: "0 9 * * *"
```

**Types I might need:**
- `Schedule` - cron expressions
- `Webhook` - HTTP endpoint, returns `{{ trigger.body }}`
- `Flow` - trigger when another flow completes

**Webhook for GitHub:**
```yaml
triggers:
  - id: github_push
    type: io.kestra.plugin.core.trigger.Webhook
    key: "my-secret-key"
    conditions:
      - type: io.kestra.plugin.core.condition.Expression
        expression: "{{ trigger.body.ref ends with 'main' }}"
```

---

## Task Types

**Script Tasks** - run code in Docker containers
```yaml
- id: python_task
  type: io.kestra.plugin.scripts.python.Script
  containerImage: python:3.11-slim
  script: |
    print("hello")
```

**HTTP Requests**
```yaml
- id: call_api
  type: io.kestra.plugin.core.http.Request
  uri: https://api.example.com
  method: POST
  body: '{{ outputs.previous.data }}'
```

**PostgreSQL**
```yaml
- id: query
  type: io.kestra.plugin.jdbc.postgresql.Query
  url: "{{ kv('DATABASE_URL') }}"
  sql: SELECT * FROM users
  fetchType: FETCH
```

---

## Flow Control

**If/Then/Else**
```yaml
- id: check
  type: io.kestra.plugin.core.flow.If
  condition: "{{ outputs.count > 0 }}"
  then:
    - id: do_something
      type: ...
```

**ForEach** - iterate over array
```yaml
- id: process_each
  type: io.kestra.plugin.core.flow.ForEach
  values: "{{ outputs.items }}"
  tasks:
    - id: process
      type: ...
```

**Parallel** - run tasks concurrently
```yaml
- id: parallel_tasks
  type: io.kestra.plugin.core.flow.Parallel
  tasks:
    - id: task1
    - id: task2
```

---

## Data Passing

**Between tasks:** `{{ outputs.taskId.propertyName }}`

**Inputs:**
```yaml
inputs:
  - id: repo_url
    type: STRING
    required: true
```
Access: `{{ inputs.repo_url }}`

**OutputFiles** - save files from script
```yaml
- id: generate
  type: io.kestra.plugin.scripts.python.Script
  outputFiles:
    - "*.json"
```

**InputFiles** - pass files to next task
```yaml
- id: consume
  inputFiles:
    data.json: "{{ outputs.generate.outputFiles['result.json'] }}"
```

---

## KV Store

**Set:**
```yaml
- id: save
  type: io.kestra.plugin.core.kv.Set
  key: my_key
  value: "{{ outputs.result }}"
```

**Get:**
```yaml
- id: load
  type: io.kestra.plugin.core.kv.Get
  key: my_key
```
Or inline: `{{ kv('my_key') }}`

---

## Secrets (Not for OSS, IG)

Access via `{{ secret('SECRET_NAME') }}`

Set in Kestra UI or via API. Never hardcode.

---

## Error Handling

**Retry:**
```yaml
- id: flaky_task
  type: ...
  retry:
    type: constant
    maxAttempt: 3
    interval: PT1M
```

**AllowFailure:**
```yaml
- id: optional
  type: ...
  allowFailure: true
```

**Errors block** - runs if flow fails
```yaml
errors:
  - id: notify_failure
    type: io.kestra.plugin.notifications.mail.MailSend
```

---

## Plugins I'm Using

| Plugin | Purpose |
|--------|---------|
| `git.Clone` | Clone repos |
| `scripts.python.Script` | Run Python in Docker |
| `jdbc.postgresql.Query` | Database operations |
| `core.http.Request` | API calls (Gemini, etc) |
| `notifications.mail.MailSend` | Email alerts |
| `core.flow.If` | Conditional logic |
| `core.flow.ForEach` | Loop over candidates |
| `core.trigger.Webhook` | GitHub push events |
| `core.trigger.Schedule` | Cron scheduling |

---

## Pebble Templating

Kestra uses Pebble (like Jinja2)

```
{{ variable }}
{{ variable | default('fallback') }}
{{ list | first }}
{{ object | json }}
{{ string | replace('old', 'new') }}
{{ date | dateAdd(1, 'DAYS') }}
```

**Conditionals in expressions:**
```
{{ condition ? 'yes' : 'no' }}
{{ value is empty }}
{{ string starts with 'prefix' }}
{{ string ends with 'suffix' }}
```

---

## WorkingDirectory

Keep files across tasks in same execution:
```yaml
- id: workspace
  type: io.kestra.plugin.core.flow.WorkingDirectory
  tasks:
    - id: clone
      type: io.kestra.plugin.git.Clone
    - id: process
      type: io.kestra.plugin.scripts.python.Script
      # can access cloned files
```

---

## Concurrency

Limit parallel executions:
```yaml
concurrency:
  limit: 1
  behavior: QUEUE  # or CANCEL
```

---

## Labels

Tag executions for filtering:
```yaml
labels:
  watcher_id: "{{ inputs.watcher_id }}"
  type: "rescan"
```

---

## Quick Reference

| Need | Solution |
|------|----------|
| Pass data between tasks | `{{ outputs.taskId.field }}` |
| Access input | `{{ inputs.name }}` |
| Get secret | `{{ secret('NAME') }}` |
| Get KV | `{{ kv('key') }}` |
| Conditional task | `If` task with `then`/`else` |
| Loop | `ForEach` with `values` |
| Run in parallel | `Parallel` task |
| Persist files | `WorkingDirectory` |
| Handle errors | `errors:` block |
| Retry failures | `retry:` on task |

---

*Last Updated: December 14, 2025*
