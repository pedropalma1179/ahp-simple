import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 446 (0-indexed 445)
# Line 446 is '// Dados formatados...'
truncated_lines = lines[:445]

dummy_return = """
  // Debug return inserted by script
  return <div>DEBUG IMPORTS SECTION</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(dummy_return)

print("Truncated to 445 lines.")
