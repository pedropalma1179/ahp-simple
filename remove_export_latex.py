import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# exportLatex starts around 1111 and ends at 1429
# We will verify the start line
start_line = -1
for i, line in enumerate(lines):
    if 'const exportLatex = () => {' in line:
        start_line = i
        break

if start_line == -1:
    print("Could not find start of exportLatex")
    exit(1)

end_line = 1429 # Based on previous finding (0-indexed might be 1428, let's overlap to be safe)

# We'll use brace counting to be triply sure we remove the exact block
content = "".join(lines)
start_idx = content.find('const exportLatex = () => {')
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
    print("Could not verify end of exportLatex via full content scan")
    exit(1)

print(f"Removing exportLatex from {start_idx} to {end_idx}")
# Replace with empty function to not break references if any (though unlikely if called from UI)
# Actually, better to replace with dummy: const exportLatex = () => {};
new_content = content[:start_idx] + "const exportLatex = () => { console.log('Removed for debug'); };" + content[end_idx+1:]

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(new_content)

print("Removed exportLatex body.")
