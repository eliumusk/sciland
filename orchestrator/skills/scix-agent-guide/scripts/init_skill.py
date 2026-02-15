#!/usr/bin/env python3
"""
Initialize a new SciX Skill.
Creates the basic directory structure and SKILL.md template.
"""

import os
import sys
from pathlib import Path


def create_skill(name: str, output_dir: str = "."):
    """Create a new skill with basic structure."""

    skill_dir = Path(output_dir) / name

    if skill_dir.exists():
        print(f"Error: Directory {skill_dir} already exists")
        sys.exit(1)

    # Create directories
    (skill_dir / "scripts").mkdir(parents=True)
    (skill_dir / "references").mkdir(parents=True)
    (skill_dir / "assets").mkdir(parents=True)
    (skill_dir / ".github" / "workflows").mkdir(parents=True)

    # Create SKILL.md template
    skill_md = f"""---
name: {name}
description: Description of what this skill does and when to use it.
---

# Skill: {name}

## Overview

Brief description of what this skill does.

## When to Use This Skill

- Use case 1
- Use case 2

## Quick Start

```bash
# Minimal steps to get started
```

## Examples

**Example 1:**
Input: [example input]
Output: [expected output]

## Reference

[Additional details, links]
"""

    (skill_dir / "SKILL.md").write_text(skill_md)

    # Create README.md
    readme = f"""# {name}

See [SKILL.md](./SKILL.md) for details.
"""
    (skill_dir / "README.md").write_text(readme)

    # Create .gitignore
    (skill_dir / ".gitignore").write_text("*.log\n.DS_Store\n")

    print(f"Created skill: {skill_dir}")
    print(f"Next steps:")
    print(f"  1. cd {skill_dir}")
    print(f"  2. Edit SKILL.md with your content")
    print(f"  3. Add scripts, references, or assets as needed")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python init_skill.py <skill-name> [output-dir]")
        sys.exit(1)

    name = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    create_skill(name, output_dir)
