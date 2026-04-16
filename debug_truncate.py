import shutil
import codecs
import os

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'
backup_path = filepath + '.bak'

# Backup
if not os.path.exists(backup_path):
    shutil.copy2(filepath, backup_path)

# Read lines
with codecs.open(filepath, 'r', 'utf-8') as f:
    lines = f.readlines()

# Truncate at line 2208 (index 2208 since 0-indexed, but 2208 is empty line)
# line 2209 is '  return (\n'
truncated_lines = lines[:2209]

# Append dummy return
dummy_return = """  return (
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

print("File truncated for debugging.")
