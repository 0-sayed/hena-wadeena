# AGENTS.md — Autonomous PR Workflow for Codex

## 🎯 Objective

Guide Codex (or any AI agent) to autonomously:
- Plan
- Implement
- Review
- Fix
- Document
- Merge

Following a structured, production-ready workflow.

---

## 🧠 General Rules

- Always think in **phases**
- Each phase must be:
  - Clear
  - Atomic
  - Commit-ready
- Prefer **small commits** over large ones
- Always prioritize **code quality + clarity**
- Never skip review steps

---

## 🚀 Full Workflow

### 1. Research Phase
- Understand the task deeply
- Produce:
  - Roadmap
  - Overview
  - Phases breakdown
- Save as:
  - `plan.md`

---

### 2. Planning Phase
- Create implementation plan using:
  - Superpowers plugin (if available)
- Structure:
  - Tasks
  - Dependencies
  - Execution order

---

### 3. Double Review Phase
- Review the plan using:
  - Claude / Codex / custom critique
- Validate:
  - Feasibility
  - Edge cases
  - Missing steps
- Refine the plan

---

### 4. Implementation Phase
- Implement using:
  - Main agent
  - Subagent-driven development
  - Ralph Wiggum Loop (iterative improvement)

Rules:
- Write clean modular code
- Follow project conventions
- Add minimal comments where needed

---

### 5. Simplification Phase
- Run `/simplify`
- Refactor:
  - Reduce complexity
  - Improve readability
  - Remove redundancy

---

### 6. Pull Request Phase
- Create PR with:
  - Clear title
  - Description of changes
  - Linked issues (if any)

---

### 7. Multi-Bot Review Phase

Trigger review from:
- CodeRabbit
- Greptile
- Gemini
- Codex
- Claude
- Devin
- Cubic

---

### 8. Review Aggregation Phase

Task:
- Pull all review comments
- Save into file:
  - `pr.md`

Categorize issues into:
- Worth Fixing
- Not Worth Fixing

Rules:
- For NOT FIXED issues:
  - Add explanation under each issue

---

### 9. Resolution Phase

- Fix all Worth Fixing issues
- Commit & push changes

Resolve GitHub conversations:
- If fixed → resolve
- If not fixed → comment with reasoning → resolve

---

### 10. Re-Review Phase

- Trigger all bots again
- Expect more strict / nitpicky feedback
- Repeat fix cycle if needed

---

### 11. Final Execution Loop

Repeat the following steps until stable:
Pull → Categorize → Fix → Resolve

---

### 12. Learning Phase

- Extract reusable knowledge from task
- Save into:
  - `learn.md`

Include:
- Patterns used
- Mistakes avoided
- Best practices discovered

---

### 13. Interactive Learning Phase

- Convert `learn.md` into:
  - Interactive HTML simulation

Purpose:
- Visual exploration
- Better understanding
- Reusability

---

### 14. Merge Phase

- Ensure:
  - All checks pass
  - No unresolved conversations
- Merge PR

---

## 📂 Output Files

- `plan.md` → roadmap & execution plan  
- `pr.md` → review aggregation  
- `learn.md` → reusable knowledge  

---

## 🧩 Notes

- This workflow is iterative
- Prioritize:
  - Stability > Speed
  - Clarity > Cleverness
- Always leave the repo better than you found it

---

## ⚡ Execution Command (Optional)

Execute full workflow step-by-step until merge is complete.