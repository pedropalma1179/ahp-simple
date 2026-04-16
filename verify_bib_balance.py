import codecs
import re

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if "activeTab === 'bibliography'" in line and "&&" in line:
        start_line = i
    if start_line != -1 and i > start_line + 5 and line.strip() == ')}':
        end_line = i
        break

if start_line == -1 or end_line == -1:
    print(f"Could not find bibliography block. Start: {start_line}, End: {end_line}")
    exit(1)

print(f"Scanning lines {start_line+1} to {end_line+1}")
content = "".join(lines[start_line:end_line+1])

open_divs = content.count('<div')
close_divs = content.count('</div>')

print(f"<div: {open_divs}, </div>: {close_divs}, Diff: {open_divs - close_divs}")

# Check stack
stack = []
for idx, char in enumerate(content):
    if char == '{':
        stack.append((idx, '{'))
    elif char == '}':
        if stack and stack[-1][1] == '{':
            stack.pop()
        else:
            print(f"Unmatched }} at offset {idx}")
    
    if char == '(':
        stack.append((idx, '('))
    elif char == ')':
        if stack and stack[-1][1] == '(':
            stack.pop()
        else:
            print(f"Unmatched ) at offset {idx}")

if stack:
    print(f"Unclosed items: {len(stack)}")
    print(f"First unclosed: {stack[0]} at context:")
    idx = stack[0][0]
    print(content[idx:idx+50])
