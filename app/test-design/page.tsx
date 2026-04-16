export default function TestDesignPage() {
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Design System Test</h1>
      </div>

      {/* Grid de Cards BOCR - Espaçamento aumentado */}
      <div className="grid-bocr grid-4 gap-8 mb-8">
        <div className="card card-benefit">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📈</span>
            <h3 className="text-xl font-semibold">Benefícios</h3>
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--bocr-benefits-500)' }}>
            35.2%
          </p>
          <p className="text-sm text-secondary mt-2">Ganho imediato identificado</p>
        </div>

        <div className="card card-opportunity">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💡</span>
            <h3 className="text-xl font-semibold">Oportunidades</h3>
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--bocr-opportunities-500)' }}>
            28.7%
          </p>
          <p className="text-sm text-secondary mt-2">Potencial estratégico</p>
        </div>

        <div className="card card-cost">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💰</span>
            <h3 className="text-xl font-semibold">Custos</h3>
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--bocr-costs-500)' }}>
            22.1%
          </p>
          <p className="text-sm text-secondary mt-2">Investimento necessário</p>
        </div>

        <div className="card card-risk">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-xl font-semibold">Riscos</h3>
          </div>
          <p className="font-mono text-2xl font-bold" style={{ color: 'var(--bocr-risks-500)' }}>
            14.0%
          </p>
          <p className="text-sm text-secondary mt-2">Incertezas identificadas</p>
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-4 mb-8">
        <button className="btn btn-primary">Botão Primário</button>
        <button className="btn btn-secondary">Botão Secundário</button>
        <button className="btn btn-ghost">Botão Ghost</button>
      </div>

      {/* Badges */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <span className="badge badge-benefit">Benefício</span>
        <span className="badge badge-opportunity">Oportunidade</span>
        <span className="badge badge-cost">Custo</span>
        <span className="badge badge-risk">Risco</span>
        <span className="badge badge-success">Consistente (CR ≤ 10%)</span>
        <span className="badge badge-warning">Atenção (CR 10-15%)</span>
        <span className="badge badge-error">Inconsistente (CR &gt; 15%)</span>
      </div>

      {/* Input */}
      <div className="max-w-md mb-8">
        <label className="input-label">Nome do Projeto</label>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Digite o nome..."
        />
        <span className="input-helper">
          Escolha um nome descritivo para o projeto
        </span>
      </div>

      {/* Tipografia */}
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold mb-4">Hierarquia Tipográfica</h2>
        <div className="space-y-4">
          <p className="text-4xl font-bold">Heading 1 - 36px Bold</p>
          <p className="text-3xl font-semibold">Heading 2 - 30px Semibold</p>
          <p className="text-2xl font-semibold">Heading 3 - 24px Semibold</p>
          <p className="text-xl font-medium">Heading 4 - 20px Medium</p>
          <p className="text-base">Body - 16px Regular (Inter)</p>
          <p className="text-sm text-secondary">Secondary - 14px Regular</p>
          <p className="font-mono text-base">Data: 0.08523 (Roboto Mono)</p>
        </div>
      </div>

      {/* Grid Responsivo */}
      <div className="card">
        <h2 className="text-2xl font-semibold mb-4">Grid Responsivo</h2>
        <p className="text-sm text-secondary mb-4">
          Redimensione a janela para ver a adaptação
        </p>
        <div className="grid-bocr grid-3">
          <div className="bg-primary-100 p-4 rounded text-center">Item 1</div>
          <div className="bg-primary-100 p-4 rounded text-center">Item 2</div>
          <div className="bg-primary-100 p-4 rounded text-center">Item 3</div>
        </div>
      </div>
    </div>
  );
}
