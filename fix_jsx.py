# Fix all JSX syntax issues in page.tsx
import codecs

filepath = r'c:\AHP-BOCR\ahp-simple\app\decisor\resultados\[projectId]\page.tsx'

with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Fix 1: Broken JSX closing tags with spaces
content = content.replace('</main >', '</main>')
content = content.replace('</footer >', '</footer>')
content = content.replace('</div >', '</div>')
content = content.replace('< footer className = "border-t bg-white mt-8 py-4" >', '<footer className="border-t bg-white mt-8 py-4">')
content = content.replace('{/* Footer */ }', '{/* Footer */}')

# Fix 2: The bibliography tab closing and footer structure
# The problematic pattern at end of file (wrong):
wrong_end = '''  )
}

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

# The correct closing structure:
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

content = content.replace(wrong_end, right_end)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)

print('All fixes applied successfully!')
