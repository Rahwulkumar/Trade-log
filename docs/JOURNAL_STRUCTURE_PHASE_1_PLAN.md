# Journal Structure Phase 1 Plan

## Goal

Turn the current freeform journal into a structured review system built around:

- reusable setups
- reusable mistakes
- reusable journal templates

This phase should build on the current foundations already present in:

- `playbooks`
- `daily_plans`
- `trades.playbook_id`
- `trades.setup_tags`
- `trades.mistake_tags`
- `trades.journal_review`

The main problem today is that the app is still too freeform in the wrong places:

- setups are not first-class
- mistakes are not first-class
- templates do not exist yet
- the journal cannot reshape itself around the trader's workflow

## Product Principles

- `Playbook` remains the strategy layer.
- Each trade should have one primary setup.
- Each trade can have multiple mistakes.
- Templates should control the journal structure, not just label it.
- Freeform tags should remain available, but as optional extras.
- Every trade should keep a template snapshot so old reviews remain stable even if templates change later.

## Scope

This phase covers:

1. Setup Library
2. Mistake Library
3. Journal Templates
4. Journal integration for those three systems
5. Analytics and reports support for the new structured objects

This phase does not yet cover:

- full rulebook builder
- full calendar review workspace
- AI coaching on top of structured review data

## Data Model

### New Tables

#### `setup_definitions`

- `id`
- `user_id`
- `name`
- `description`
- `playbook_id` nullable
- `preferred_session`
- `preferred_market_condition`
- `entry_criteria` JSONB or text
- `invalidation_rules`
- `management_notes`
- `example_notes`
- `default_template_id` nullable
- `is_active`
- timestamps

#### `mistake_definitions`

- `id`
- `user_id`
- `name`
- `category`
- `severity`
- `description`
- `correction_guidance`
- `is_active`
- timestamps

#### `journal_templates`

- `id`
- `user_id`
- `name`
- `description`
- `scope_type` such as `global`, `playbook`, `setup`, `account`
- `playbook_id` nullable
- `config` JSONB
- `version`
- `is_active`
- timestamps

#### `trade_mistakes`

- `trade_id`
- `mistake_definition_id`
- optional `notes`
- timestamps

### Trade Table Changes

Add these nullable columns to `trades`:

- `setup_definition_id`
- `journal_template_id`
- `journal_template_snapshot` JSONB

Keep existing fields for backward compatibility:

- `setup_tags`
- `mistake_tags`
- `journal_review`

## Template Config

Templates should define how the journal behaves.

Template config should control:

- chapter order
- enabled chapters
- prompt copy per chapter
- required fields
- checklist items
- rating controls enabled or disabled
- screenshot requirements
- custom prompts
- default open and collapsed sections

### Expected Template Chapters

- `Narrative`
- `Thesis`
- `Market Context`
- `Execution`
- `Psychology`
- `Scorecard`
- `Closeout`
- `Screenshots`
- `Custom Questions`

The journal should eventually render from template config rather than relying on one permanently hardcoded flow.

## UI Surfaces

Use the existing playbooks area as the management hub instead of creating scattered routes.

Extend the playbooks workspace into four library tabs:

- `Strategies`
- `Setups`
- `Mistakes`
- `Templates`

Each tab should support:

- list or library view
- search
- active and inactive filtering
- create and edit dialog or side panel
- lightweight stats where useful

### Setups UI

Each setup should support:

- name
- linked playbook
- preferred session
- preferred market condition
- criteria checklist
- invalidation rules
- management notes
- example notes
- default template
- active or inactive state

### Mistakes UI

Each mistake should support:

- name
- category
- severity
- description
- correction guidance
- active or inactive state

### Templates UI

Each template should support:

- name
- description
- scope
- chapter order editor
- chapter enable and disable controls
- prompt editor
- checklist builder
- screenshot rules
- live preview

## Journal Changes

The journal flow should become:

1. choose strategy from playbooks
2. choose setup from setup library
3. template auto-loads from setup, playbook, account, or default
4. journal sections reshape themselves from template config
5. mistakes are selected from the mistake library
6. optional freeform tags remain available under additional tags

### Concrete Journal Changes

- Replace manual setup text entry with a setup selector plus optional setup note.
- Replace mistake-tag-only input with a searchable multi-select mistake picker.
- Keep freeform setup and mistake tags, but move them into an additional tags area.
- Show template name and version in the journal header.
- Save `setup_definition_id`, `journal_template_id`, and `journal_template_snapshot` from the journal autosave flow.

## Analytics and Reports Impact

Once structured objects exist, analytics and reports become much more reliable.

Add filters and groupings for:

- setup
- mistake
- template
- playbook
- session
- review completion

Key views to support after this phase:

- setup win rate
- setup expectancy
- mistake cost
- mistake frequency by session
- template completion rate
- setup performance by playbook

## Migration Strategy

### Step 1

Add new tables and nullable trade columns.

### Step 2

Keep existing journal behavior working with fallback mapping.

### Step 3

Add a promotion helper for historical freeform data.

Important rule:

Do not blindly convert every existing freeform tag into a formal library item.

Instead, surface:

- distinct setup names
- distinct setup tags
- distinct mistake tags

Then let the user promote selected values into structured setup and mistake definitions.

This avoids polluting the new structured system with low-quality historical labels.

## API Layer

Add API routes and validation for:

- `/api/setups`
- `/api/setups/[id]`
- `/api/mistakes`
- `/api/mistakes/[id]`
- `/api/templates`
- `/api/templates/[id]`

Update trade save flow so autosave can persist:

- setup definition id
- selected mistakes
- journal template id
- journal template snapshot

## Rendering and UX Rules

- Template switching must not wipe the current draft.
- The journal should only remount sections that actually change.
- Inactive template sections should remain lightweight.
- Setup and mistake selectors should support autocomplete and typeahead.
- Template preview should be local and fast, not dependent on a slow round trip.

## Implementation Order

1. schema changes and types
2. setup library CRUD
3. mistake library CRUD
4. template library CRUD
5. journal integration
6. analytics and reports integration
7. promotion helper for historical tags
8. polish and migration cleanup

## Success Criteria

This phase is successful when:

- setups can be defined once and reused across trades
- mistakes can be defined once and selected consistently
- the journal changes shape based on template choice
- analytics can filter and group by setup, mistake, and template
- old journaled trades still open correctly
- freeform tags still work, but no longer carry the whole classification system

## Follow-On Phase

After this phase, the next logical step is:

- dedicated calendar review workspace

That phase will become much stronger once setup, mistake, and template data are structured enough to review day by day.
