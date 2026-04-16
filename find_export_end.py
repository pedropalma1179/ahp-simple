import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

start_str = 'const exportLatex = () => {'
start_idx = content.find(start_str)

if start_idx == -1:
    print("Not found")
    exit(1)

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

# Count newlines to get line number
lines = content.splitlines()
line_count = content[:end_idx].count('\n') + 1

print(f"exportLatex ends at line {line_count}")
