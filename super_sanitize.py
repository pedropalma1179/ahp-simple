import codecs
import re

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Find line with "return ("
return_idx = -1
for i, line in enumerate(lines):
    if i > 2200 and line.strip() == 'return (':
        return_idx = i
        break

if return_idx == -1:
    print("Could not find return line.")
    exit(1)

# We want to replace from ~2200 (end of previous block) to return_idx + 1 (start of div)
# Previous block ends with }
prev_block_end = -1
for i in range(return_idx - 1, return_idx - 20, -1):
    if lines[i].strip() == '}':
        prev_block_end = i
        break

if prev_block_end == -1:
    print("Could not find previous block end.")
    exit(1)

print(f"Replacing lines {prev_block_end+1} to {return_idx}")
# Keep lines up to prev_block_end (inclusive)
# Insert clean whitespace
# Append return (
# Append <div
# Keep from return_idx + 2 onwards (assuming return_idx+1 is <div)

new_lines = lines[:prev_block_end+1]
new_lines.append('\n\n  // RENDER\n  return (\n')
# We need to make sure the next line is the div line
# If lines[return_idx+1] is the div line, we keep it.
# But we should verify it doesn't have garbage.
# We will just use the existing lines from return_idx + 1 onwards, assuming the garbage was in the comments or whitespace before it.
new_lines.extend(lines[return_idx+1:])

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(new_lines)

print("Super sanitization complete.")
