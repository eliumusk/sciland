#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    python init_skill.py <skill-name> --path <path>

Examples:
    python init_skill.py my-new-skill --path skills/public
    python init_skill.py my-api-helper --path skills/private
    python init_skill.py custom-skill --path /custom/location
"""

import sys
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Quick Start

```bash
# Minimal steps to get started
```

## When to Use This Skill

- Use case 1
- Use case 2

## Examples

**Example 1:**
Input: [example input]
Output: [expected output]

## Resources

This skill may include:

- **scripts/** - Executable code for automation
- **references/** - Documentation loaded as needed
- **assets/** - Files used in output (templates, etc.)
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
Example helper script for {skill_name}

Replace with actual implementation or delete if not needed.
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO: Add actual script logic here

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# Reference Documentation for {skill_title}

Replace with actual reference content or delete if not needed.

## When Reference Docs Are Useful

- Comprehensive API documentation
- Detailed workflow guides
- Content too lengthy for main SKILL.md
- Content only needed for specific use cases
"""

EXAMPLE_ASSET = """# Example Asset

This placeholder represents where asset files would be stored.
Replace with actual asset files or delete if not needed.
"""


def title_case_skill_name(skill_name):
    """Convert hyphenated skill name to Title Case for display."""
    return ' '.join(word.capitalize() for word in skill_name.split('-'))


def init_skill(skill_name, path):
    """Initialize a new skill directory with template SKILL.md."""
    skill_dir = Path(path).resolve() / skill_name

    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md from template
    skill_title = title_case_skill_name(skill_name)
    skill_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_title=skill_title
    )

    skill_md_path = skill_dir / 'SKILL.md'
    try:
        skill_md_path.write_text(skill_content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create resource directories with example files
    try:
        scripts_dir = skill_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        example_script = scripts_dir / 'example.py'
        example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
        example_script.chmod(0o755)
        print("Created scripts/example.py")

        references_dir = skill_dir / 'references'
        references_dir.mkdir(exist_ok=True)
        example_reference = references_dir / 'reference.md'
        example_reference.write_text(EXAMPLE_REFERENCE.format(skill_title=skill_title))
        print("Created references/reference.md")

        assets_dir = skill_dir / 'assets'
        assets_dir.mkdir(exist_ok=True)
        example_asset = assets_dir / 'example.txt'
        example_asset.write_text(EXAMPLE_ASSET)
        print("Created assets/example.txt")
    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None

    print(f"\nSkill '{skill_name}' initialized at {skill_dir}")
    print("Next steps:")
    print("  1. Edit SKILL.md")
    print("  2. Customize or delete example files")
    print("  3. Run quick_validate.py to check structure")

    return skill_dir


def main():
    if len(sys.argv) < 4 or sys.argv[2] != '--path':
        print("Usage: python init_skill.py <skill-name> --path <path>")
        print("\nExamples:")
        print("  python init_skill.py my-skill --path skills/public")
        print("  python init_skill.py pdf-helper --path /custom/skills")
        sys.exit(1)

    skill_name = sys.argv[1]
    path = sys.argv[3]

    # Validate skill name format
    import re
    if not re.match(r'^[a-z0-9-]+$', skill_name):
        print("Error: Skill name must be hyphen-case (lowercase letters, digits, hyphens only)")
        sys.exit(1)

    if len(skill_name) > 64:
        print("Error: Skill name must be 64 characters or less")
        sys.exit(1)

    print(f"Initializing skill: {skill_name}")
    print(f"Location: {path}")
    print()

    result = init_skill(skill_name, path)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
