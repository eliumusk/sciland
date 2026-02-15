#!/usr/bin/env python3
"""
Quick validation for SciX Skills.
Checks SKILL.md structure and required fields.
"""

import sys
from pathlib import Path


def validate(skill_dir: Path) -> bool:
    """Validate skill structure."""

    skill_md = skill_dir / "SKILL.md"

    if not skill_md.exists():
        print("Error: SKILL.md not found")
        return False

    content = skill_md.read_text()

    # Check frontmatter
    if not content.startswith("---"):
        print("Error: Missing YAML frontmatter")
        return False

    # Extract frontmatter
    lines = content.split("\n")
    frontmatter_end = -1
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            frontmatter_end = i
            break

    if frontmatter_end == -1:
        print("Error: Missing closing --- in frontmatter")
        return False

    frontmatter = "\n".join(lines[1:frontmatter_end])

    if "name:" not in frontmatter:
        print("Error: Missing 'name' in frontmatter")
        return False

    if "description:" not in frontmatter:
        print("Error: Missing 'description' in frontmatter")
        return False

    print("Validation passed!")
    return True


if __name__ == "__main__":
    skill_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    success = validate(skill_dir)
    sys.exit(0 if success else 1)
