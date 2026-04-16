const fs = require('fs');
let c = fs.readFileSync('app/avaliacao/[projectId]/page.tsx', 'utf8');
const initialLength = c.length;

// Step 1: Stepper labels (change Consentimento first)
c = c.replace(/className="ml-1\.5 text-xs( [^>]*>)\s*Consentimento\s*<\/span>/g, 'className="ml-1.5 text-sm$1Termo</span>');
c = c.replace(/className="ml-1\.5 text-xs( [^>]*>)(.*?)<\/span>/g, 'className="ml-1.5 text-sm$1$2</span>');

// Subtítulo da pesquisa ("Seleção de tecnologia I4.0...") (currently text-xs or text-sm?)
c = c.replace(/className="text-sm text-white\/50"/g, 'className="text-base text-white/50"');

// Header Verificação de Identidade (text-sm -> text-base)
c = c.replace(/className="text-sm text-cyan-300"/g, 'className="text-base text-cyan-300"');

// Digite seu email
c = c.replace(/className="text-cyan-300\/70"/g, 'className="text-sm text-cyan-300/70"');

// Seu email / Código labels
c = c.replace(/className="block text-sm font-semibold/g, 'className="block text-base font-semibold');

// Código enviado
c = c.replace(/className="text-xs text-white\/40 mt-2 text-center"/g, 'className="text-sm text-white/40 mt-2 text-center"');

// Ajuda
c = c.replace(/className="text-xs text-white\/25 tracking-wide"/g, 'className="text-sm text-white/25 tracking-wide"');

// TCLE / Consent
c = c.replace(/className="(.*?)text-sm text-white\/80 leading-relaxed"/g, 'className="$1text-base text-white/80 leading-relaxed"');

// Títulos seção TCLE
c = c.replace(/className="text-xs text-cyan-400 font-semibold uppercase tracking-wider/g, 'className="text-sm text-cyan-400 font-semibold uppercase tracking-wider');

// Checkbox aceite
c = c.replace(/className="text-sm text-white\/70 group-hover:text-white\/90/g, 'className="text-base text-white/70 group-hover:text-white/90');

// Demográficos - titles
c = c.replace(/className="text-sm text-white\/60 mb-2"/g, 'className="text-base text-white/60 mb-2"');

// Select / options
c = c.replace(/className="w-full bg-white\/5 border border-white\/10 text-white text-sm/g, 'className="w-full bg-white/5 border border-white/10 text-white text-base');
c = c.replace(/className="text-sm bg-slate-900/g, 'className="text-base bg-slate-900');

// Hints
c = c.replace(/className="text-xs text-white\/40 mb-2 italic"/g, 'className="text-sm text-white/40 mb-2 italic"');

// text-xs text-white/50 (like {completedCount} de {totalGroups})
c = c.replace(/className="text-xs text-white\/50/g, 'className="text-sm text-white/50');
c = c.replace(/className="text-xs text-white\/30/g, 'className="text-sm text-white/30');
c = c.replace(/className="text-xs text-white\/60/g, 'className="text-sm text-white/60');

// Pesquisa
c = c.replace(/className="text-sm text-white\/60 leading-relaxed/g, 'className="text-base text-white/60 leading-relaxed');
c = c.replace(/className="text-xs text-gray-500 leading-relaxed/g, 'className="text-sm text-gray-500 leading-relaxed');
c = c.replace(/className="text-xs text-gray-300 leading-relaxed/g, 'className="text-sm text-gray-300 leading-relaxed');
c = c.replace(/className="text-xs text-gray-400 italic/g, 'className="text-sm text-gray-400 italic');

// comparacoes / sliders labels
c = c.replace(/className="flex justify-between text-xs text-gray-400/g, 'className="flex justify-between text-sm text-gray-400');
c = c.replace(/className="flex items-center justify-center mb-3 px-2 text-xs text-gray-400/g, 'className="flex items-center justify-center mb-3 px-2 text-sm text-gray-400');

// x de y respondidas
c = c.replace(/className="text-white\/40 text-xs/g, 'className="text-white/40 text-sm');

// Agradecimento
c = c.replace(/className="text-sm text-cyan-200/g, 'className="text-base text-cyan-200');
c = c.replace(/className="text-xs text-gray-500"/g, 'className="text-sm text-gray-500"'); // for contact? Let's check.
c = c.replace(/<p className="text-gray-500 text-xs mt-1"/g, '<p className="text-gray-500 text-sm mt-1"');


// Headers do bloco de comparação
c = c.replace(/<h3 className="text-sm font-semibold/g, '<h3 className="text-base font-semibold');

// Context cards labels
c = c.replace(/className="text-xs font-medium text-white\/80"/g, 'className="text-sm font-medium text-white/80"');

fs.writeFileSync('app/avaliacao/[projectId]/page.tsx', c, 'utf8');
console.log('done, length:', initialLength, '->', c.length);
