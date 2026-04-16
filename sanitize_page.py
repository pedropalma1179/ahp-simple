import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Sanitize start of return
# Look for the pattern
old_return_start = '  // ============================================================\r\n  // RENDER\r\n  // ============================================================\r\n\r\n  return ('
if old_return_start not in content:
    # Try normalized newlines
    old_return_start = old_return_start.replace('\r\n', '\n')

if old_return_start in content:
    print("Found return start block")
else:
    print("Could not find return start block by exact match. Trying looser matching.")
    # Fallback: finding the line
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.strip() == 'return (':
            print(f"Found return at line {i+1}")
            # We will just rewrite this line and the next few lines
            # But string replacement is safer if context is unique
            pass

# We will unconditionally Replace line 2209/2210 area using regex
import re
content = re.sub(r'return \(\s*<div', 'return (\n    <div', content)

# Sanitize Bibliography wrapper
# Find { activeTab === 'bibliography' && (
# Ensure it is clean
content = content.replace('{ activeTab === \'bibliography\' && (', '{activeTab === \'bibliography\' && (')
content = content.replace('{\n  activeTab === \'bibliography\' && (', '{activeTab === \'bibliography\' && (')

# Sanitize the problematic end of file (already done by fix_jsx.py but do it again)
right_end = '''  )}

      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Sistema AHP-BOCR 4.0</p>
          <p className="mt-1">Desenvolvido para dissertação de mestrado em Engenharia de Produção - UNESP</p>
        </div>
      </footer>
    </div>
  );
}'''
# We rely on fix_jsx.py for this, or just re-apply it here via the includes
# But let's check one more thing:
# The Sumário de Validação block (line 3900)
# Make sure indentation there is clean
# (already handled by fix_jsx.py)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)

print("Sanitization complete.")
