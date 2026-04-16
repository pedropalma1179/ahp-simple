import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 460
truncated_lines = lines[:460]

dummy_return = """
  return <div>DEBUG IMPORTS SECTION</div>;
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(dummy_return)

print("Truncated to 460 lines.")
