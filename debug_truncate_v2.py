import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

# Read lines
with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 2208 (1-indexed), so index 2208 is line 2209.
# We want to KEEP up to line 2208 (index 2207).
# Remove line 2209 'return (' and everything after.
truncated_lines = lines[:2208] 

# Append simple return
dummy_return = """
  return (
    <div className="min-h-screen p-10">
      <h1>DEBUG MODE</h1>
      <p>Testing syntax error location...</p>
    </div>
  );
}
"""

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.writelines(truncated_lines)
    f.write(dummy_return)

print("File truncated correctly this time.")
