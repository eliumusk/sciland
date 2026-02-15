#!/usr/bin/env python3
"""
Package a SciX Skill into a distributable .skill file.
Validates the skill before packaging.
"""

import sys
import zipfile
from pathlib import Path


def validate_skill(skill_dir: Path) -> bool:
    """Validate skill structure and required files."""

    # Check SKILL.md exists
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        print("Error: SKILL.md not found")
        return False

    # Check frontmatter
    content = skill_md.read_text()
    if not content.startswith("---"):
        print("Error: SKILL.md must start with YAML frontmatter (---)")
        return False

    if "name:" not in content or "description:" not in content:
        print("Error: SKILL.md frontmatter must include name and description")
        return False

    print("Validation passed!")
    return True


def package_skill(skill_dir: Path, output_dir: Path = None) -> bool:
    """Package skill into a .skill file (zip)."""

    if not skill_dir.exists():
        print(f"Error: Directory {skill_dir} not found")
        return False

    # Validate first
    if not validate_skill(skill_dir):
        return False

    # Determine output
    if output_dir is None:
        output_dir = skill_dir.parent
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create .skill file (zip with .skill extension)
    skill_name = skill_dir.name
    output_file = output_dir / f"{skill_name}.skill"

    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in skill_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(skill_dir)
                zf.write(file, arcname)

    print(f"Packaged: {output_file}")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python package_skill.py <skill-dir> [output-dir]")
        sys.exit(1)

    skill_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    success = package_skill(skill_dir, output_dir)
    sys.exit(0 if success else 1)
