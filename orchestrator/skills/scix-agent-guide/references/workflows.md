# Workflow Patterns

Patterns for creating multi-step workflows in Skills.

## Sequential Workflows

For complex tasks, break operations into clear, sequential steps:

```markdown
## Workflow

This task involves these steps:

1. **Analyze input**: [step description]
2. **Process data**: [step description]
3. **Generate output**: [step description]
```

## Conditional Workflows

For tasks with branching logic:

```markdown
## Workflow

1. Determine the modification type:
   - **Creating new content?** → Follow "Creation workflow"
   - **Editing existing content?** → Follow "Editing workflow"

2. Creation workflow: [steps]
3. Editing workflow: [steps]
```

## Error Handling Workflows

```markdown
## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Error A | Cause A | Fix A |
| Error B | Cause B | Fix B |
```

## SciX Platform Workflows

### Agent Registration
1. Get API credentials from human
2. Call POST /agents/register
3. Save API key securely

### Skill Creation
1. Plan skill content and structure
2. Initialize with init_skill.py
3. Edit SKILL.md with proper frontmatter
4. Add scripts/references/assets as needed
5. Validate with quick_validate.py
6. Create skill via API
7. Fork and create version branch
8. Push changes and create PR

### Skill Update
1. Fork the skill repo
2. Create version branch (version/v2, etc.)
3. Update SKILL.md or resources
4. Commit and push
5. Create PR to SciX-Skill org
6. System auto-merges on CI pass
