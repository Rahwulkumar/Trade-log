# Git Workflow Guide - Pushing Code to GitHub

## Current Situation

You're on branch: `chore/codebase-audit`
- ✅ Terminal Farm files restored (from `feature/journal-redesign`)
- ✅ Audit fixes completed
- ✅ New migrations created
- ✅ New utility files created

---

## Step-by-Step: Push to GitHub

### Step 1: Review Your Changes

```bash
# See all modified/new files
git status

# See what changed in specific files
git diff src/app/api/extension/route.ts

# See summary of changes
git diff --stat
```

### Step 2: Stage Your Changes

**Option A: Stage All Changes (Recommended for your case)**
```bash
# Stage all modified and new files
git add .

# Or stage specific files
git add src/lib/terminal-farm/
git add src/app/api/webhook/terminal/
git add src/app/api/orchestrator/
git add supabase/migrations/20260207000000_fix_prop_firms_rls.sql
git add supabase/migrations/20260207000001_add_trade_indexes.sql
git add src/lib/validation/extension-api.ts
git add src/lib/utils/error-handler.ts
```

**Option B: Stage by Category**
```bash
# Stage terminal farm files
git add src/lib/terminal-farm/ src/app/api/webhook/terminal/ src/app/api/orchestrator/ src/app/api/terminal-farm/ src/lib/api/terminal-farm.ts src/app/api/mt5-accounts/

# Stage audit fixes
git add src/app/api/extension/route.ts src/app/analytics/page.tsx src/app/dashboard/page.tsx src/app/weekly/page.tsx src/components/calendar/trading-calendar.tsx src/lib/api/analytics.ts src/lib/api/trades.ts src/lib/mt5/sync.ts

# Stage new migrations
git add supabase/migrations/20260207000000_fix_prop_firms_rls.sql supabase/migrations/20260207000001_add_trade_indexes.sql

# Stage new utilities
git add src/lib/validation/extension-api.ts src/lib/utils/error-handler.ts
```

### Step 3: Verify Staged Changes

```bash
# See what's staged
git status

# See detailed diff of staged changes
git diff --cached
```

### Step 4: Commit Your Changes

```bash
# Commit with descriptive message
git commit -m "feat: restore terminal farm files and complete audit fixes

- Restore terminal farm files from feature/journal-redesign branch
- Fix RLS policies for prop_firms and prop_firm_challenges
- Add Zod validation for extension API
- Enhance DEV mode bypass security
- Fix null safety issues in calendar component
- Optimize database queries (replace select('*'))
- Add database indexes for performance
- Create centralized error handling utility
- Fix ESLint violations (Link components, apostrophes)
- Fix variable declarations (let to const)"
```

**Or use a shorter message:**
```bash
git commit -m "feat: restore terminal farm and complete audit fixes"
```

### Step 5: Push to GitHub

**If this is the first push for this branch:**
```bash
# Push and set upstream
git push -u origin chore/codebase-audit
```

**If you've pushed before:**
```bash
# Just push
git push
```

### Step 6: Verify on GitHub

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO`
2. Check branch: `chore/codebase-audit`
3. Verify all files are there

---

## Alternative: Create a Pull Request

If you want to merge into `main`:

### Step 1: Push your branch
```bash
git push -u origin chore/codebase-audit
```

### Step 2: Create PR on GitHub
1. Go to your repo on GitHub
2. Click "Pull Requests" → "New Pull Request"
3. Base: `main` ← Compare: `chore/codebase-audit`
4. Add description:
   ```
   ## Changes
   - Restored Terminal Farm files from feature/journal-redesign
   - Completed all critical security fixes from audit
   - Optimized database queries and added indexes
   - Fixed type safety and null safety issues
   - Standardized error handling
   ```

### Step 3: Review and Merge
- Review the changes
- Merge when ready

---

## Quick Reference Commands

```bash
# Check status
git status

# See what branch you're on
git branch

# Stage all changes
git add .

# Commit
git commit -m "Your message here"

# Push
git push

# If first push
git push -u origin chore/codebase-audit

# See commit history
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo staging (keep file changes)
git reset HEAD <file>
```

---

## Common Issues & Solutions

### Issue: "Your branch is ahead of origin"
**Solution:** Just push - `git push`

### Issue: "Updates were rejected"
**Solution:** Someone else pushed. Pull first:
```bash
git pull origin chore/codebase-audit
# Resolve conflicts if any
git push
```

### Issue: "Untracked files" (like .agent/, logs)
**Solution:** Add to `.gitignore`:
```bash
# Add to .gitignore
echo ".agent/" >> .gitignore
echo "*.log" >> .gitignore
echo "eslint-*.json" >> .gitignore
```

### Issue: Want to exclude some files
**Solution:** Use `.gitignore` or stage selectively:
```bash
# Don't stage specific files
git add -u  # Only staged files
git reset HEAD <file-to-exclude>
```

---

## Recommended Workflow for Your Case

```bash
# 1. Review changes
git status

# 2. Add .gitignore entries for temp files (optional)
echo ".agent/" >> .gitignore
echo "*.log" >> .gitignore
echo "eslint-*.json" >> .gitignore
echo "lint_*.json" >> .gitignore

# 3. Stage important files (exclude temp files)
git add src/
git add supabase/migrations/
git add docs/
git add .gitignore

# 4. Commit
git commit -m "feat: restore terminal farm and complete audit fixes"

# 5. Push
git push -u origin chore/codebase-audit
```

---

## What Gets Pushed

✅ **Will be pushed:**
- All Terminal Farm files
- Audit fixes
- New migrations
- New utility files
- Modified source files

❌ **Won't be pushed (if in .gitignore):**
- `.agent/` folder
- `*.log` files
- `eslint-*.json` files
- `node_modules/` (already ignored)
- `.env` files (already ignored)

---

## Next Steps After Push

1. **Create PR** (if merging to main)
2. **Continue with GCP setup** (now that code is safe)
3. **Test locally** before merging
