import codecs
import re

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace body of exportLatex
# Look for const exportLatex = () => { ... }
# We know it starts around 1111.
# We'll use strict string replacement based on what we saw
start_str = 'const exportLatex = () => {'
if start_str not in content:
    print("Could not find exportLatex start")
    exit(1)

# We need to find the matching closing brace for this function.
# It is large.
# Instead of parsing, let's just find the start, and replace everything until the end of the file ... NO.
# exportLatex is followed by useEffect at 1030? No, wait.
# exportLatex (1111) is followed by return (2209).
# So exportLatex logic continues until ... where? 1345 was inside it.

# Let's verify where exportLatex ends.
# I will use my brace counting logic to find the closing brace of exportLatex.

start_idx = content.find(start_str)
brace_count = 0
found_start = False
end_idx = -1

for i in range(start_idx, len(content)):
    char = content[i]
    if char == '{':
        brace_count += 1
        found_start = True
    elif char == '}':
        brace_count -= 1
        if found_start and brace_count == 0:
            end_idx = i
            break

if end_idx == -1:
    print("Could not find end of exportLatex")
    exit(1)

print(f"Replacing exportLatex body from {start_idx} to {end_idx}")

new_body = 'const exportLatex = () => {\n    console.log("Empty exportLatex");\n  }'
new_content = content[:start_idx] + new_body + content[end_idx+1:]

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(new_content)

print("Replaced exportLatex body.")
