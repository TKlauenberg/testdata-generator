# Epic 4 Dependency Review

**Date:** 2026-02-10
**Reviewer:** Barry (Quick Flow Agent)
**Purpose:** Identify dependency gaps before Epic 4 kickoff per Epic 3 Retrospective Action Item #5

---

## Story-by-Story Analysis

### ✅ Story 4.1: CLI Foundation with Commander.js

**Dependencies:**
- Commander.js v14.0.2 (external package - install during story)
- @testdata-generator/core package (exists from Epic 3)

**Status:** No blockers. Good to implement.

---

### ✅ Story 4.2: Generate Command Implementation

**Dependencies:**
- `generateData(source, options)` function from Epic 3 Story 3.6 ✅ Exists
- `validateSchema(source)` function from Epic 2 ✅ Exists
- Seed parameter support from Epic 3 ✅ Exists
- JSON output from Epic 3 Story 3.5 ✅ Exists
- Error formatting from Story 4.5 ⚠️ See ordering note below

**Format Support:**
- ✅ **FIXED:** Changed from `json|csv|sql` to `json` only
- CSV adapter: Epic 10 Story 10.1 (5 epics away)
- SQL adapter: Epic 10 Story 10.2 (5 epics away)
- Note added to AC about Epic 10

**Status:** No blockers after format fix.

---

### ⚠️ Story 4.3: Validate Command Implementation

**Dependencies:**
- `validateSchema(source)` function from Epic 2 ✅ Exists
- Error formatting from Story 4.5 ⚠️ See ordering note below

**AC Quote:** "validation errors are displayed with Rust-style formatting"

**Ordering Issue:**
- Story 4.3 needs Rust-style error formatter
- Story 4.5 implements Rust-style error formatter
- Current order: 4.3 comes BEFORE 4.5

**Options:**
1. Implement 4.5 first, then 4.3 uses it
2. Implement 4.3 with basic formatting, enhance in 4.5
3. Develop 4.5 in parallel with 4.2/4.3

**Recommendation:** Implement 4.5 FIRST (or parallel), then 4.2/4.3 can use it. Story order in epic doesn't have to match implementation order.

**Status:** Dependency exists but manageable with correct implementation order.

---

### ⚠️ Story 4.4: Init Command Implementation

**Dependencies:**
- No core functionality dependencies ✅

**Template Dependencies:**
- "basic" template - uses primitive generators ✅ Exists from Epic 3
- "with-relationships" template - relationships are **Epic 6** (2 epics away) ❌ Doesn't exist yet
- "with-context" template - context is **Epic 8** (4 epics away) ❌ Doesn't exist yet

**Issue:** Story creates templates for features that don't exist yet.

**Options:**
1. **Remove advanced templates** - Only create "basic" template in Story 4.4, add others in Epics 6/8
2. **Create syntax examples** - Templates show the DSL syntax even though features are unimplemented (users can't generate from them until Epic 6/8)
3. **Create placeholders** - Add TODO comments in templates for future features

**Recommendation:** Option 1 is cleanest. Update Story 4.4 to create only "basic" template initially. Add stories to Epic 6 and Epic 8 to add their respective templates when those features are implemented.

**Updated AC Suggestion:**
```markdown
**And** `td init [template]` accepts template name: `basic` (default)
[Note: Additional templates (with-relationships, with-context) will be added in respective epics when features are implemented]
```

**Status:** ⚠️ Needs AC update to avoid scope creep or broken templates.

---

### ✅ Story 4.5: Rust-Style Error Formatter

**Dependencies:**
- No external dependencies ✅
- Uses diagnostic system from Epic 1 ✅ Exists

**Usage:**
- Used by Story 4.2 (generate command errors)
- Used by Story 4.3 (validate command errors)
- Potentially used by Story 4.4 (init command file conflicts)

**Ordering Note:** This story is listed last but is a dependency for earlier stories. Implementation order should be flexible.

**Status:** No blockers. Should be implemented early or in parallel.

---

## Summary of Findings

### ✅ Fixed During Review
- **Story 4.2:** Format support updated from `json|csv|sql` to `json` only

### ⚠️ Issues Requiring Decisions

**1. Story Order vs Implementation Order (LOW PRIORITY)**
- **Issue:** Story 4.5 (Error Formatter) is used by Stories 4.2 and 4.3 but listed last
- **Impact:** Minor - developers can implement out of order
- **Recommendation:** Note in story kickoff that 4.5 should be implemented early/parallel
- **No AC changes needed** - just implementation guidance

**2. Init Command Templates (MEDIUM PRIORITY)**
- **Issue:** Story 4.4 creates templates for Epic 6 (relationships) and Epic 8 (context) features that don't exist yet
- **Impact:** Moderate - templates would be syntactically valid but non-functional until Epic 6/8
- **Recommendation:** Update Story 4.4 to create only "basic" template initially; add template stories to Epic 6/8
- **AC changes needed** - see suggestion above

---

## Recommended Actions

### IMMEDIATE (Before Epic 4 Kickoff)

**Action 1: Update Story 4.4 Template Scope**
- **Owner:** Alice (Product Owner)
- **Estimated:** 15 minutes
- **Change:** Update AC to create only "basic" template initially
- **Rationale:** Avoid scope creep for features 2-4 epics away

### DURING EPIC 4

**Action 2: Note Story 4.5 Implementation Priority**
- **Owner:** Charlie/Developer implementing Epic 4
- **When:** Story 4.1 planning
- **Guidance:** Implement 4.5 early or in parallel with 4.2/4.3 since it's a shared dependency

---

## Dependencies from Epic 3 - All Satisfied ✅

- ✅ `generateData(source, options)` public API (Story 3.6)
- ✅ `validateSchema(source)` validation pipeline (Epic 2)
- ✅ JSON adapter for file output (Story 3.5)
- ✅ Seed parameter support (Story 3.1-3.6)
- ✅ Result type pattern established (Epic 1)
- ✅ Diagnostic system exists (Epic 1)
- ✅ Testing infrastructure (unit + BDD) (Epic 1)

---

## Comparison to Epic 3 Retrospective Discovery

**Epic 3 Retro found:** Story 4.2 format dependency issue (CSV/SQL don't exist)
**Status:** ✅ Fixed during this review

**This review found:** Story 4.4 template dependency issue (relationships/context don't exist)
**Status:** ⚠️ Requires decision

---

## Verdict: Epic 4 Readiness

**Overall:** ✅ Ready to start after Story 4.4 update

**Critical Blockers:** 0
**Medium Issues:** 1 (Story 4.4 templates)
**Low Issues:** 1 (Story ordering guidance)

**Time to Resolve:** ~15 minutes for AC update

**Cleared for Epic 4 Kickoff:** Yes, after Alice updates Story 4.4 AC

---

**Review Complete:** 2026-02-10
**Next Action:** Alice to review and update Story 4.4 template scope
