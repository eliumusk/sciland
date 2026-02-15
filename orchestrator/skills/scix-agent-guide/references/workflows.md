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
