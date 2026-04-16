// components/BOCRHierarchyD3.tsx
/**
 * Hierarquia BOCR usando D3.js - Sunburst Diagram
 * 
 * Visualização hierárquica dos pesos BOCR:
 * - Centro: BOCR (B, O, C, R)
 * - Anel 1: Subcritérios (B1-B5, O1-O5, etc)
 * - Anel 2: Alternativas
 * 
 * Interatividade:
 * - Click para zoom
 * - Hover para detalhes
 * - Animações suaves
 * - Cores por mérito
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Info, Maximize2, Download } from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface BOCRHierarchyD3Props {
  calculation: any;
  width?: number;
  height?: number;
}

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
  color?: string;
  description?: string;
}

// ============================================================
// CORES POR MÉRITO
// ============================================================

const MERIT_COLORS = {
  B: '#10b981', // Verde (Benefícios)
  O: '#3b82f6', // Azul (Oportunidades)
  C: '#f59e0b', // Laranja (Custos)
  R: '#ef4444'  // Vermelho (Riscos)
};

// ============================================================
// PROCESSAR DADOS
// ============================================================

function processHierarchyData(calculation: any): HierarchyNode {
  const root: HierarchyNode = {
    name: 'BOCR',
    children: []
  };

  const bocrWeights = calculation?.bocr_weights || {};
  const subWeights = calculation?.sub_weights || {};
  const finalScores = calculation?.final_scores || {};

  // Criar nós BOCR
  ['B', 'O', 'C', 'R'].forEach(merit => {
    const meritWeight = bocrWeights[merit] || 0;
    const meritNode: HierarchyNode = {
      name: merit === 'B' ? 'Benefícios' :
            merit === 'O' ? 'Oportunidades' :
            merit === 'C' ? 'Custos' :
            'Riscos',
      value: meritWeight,
      color: MERIT_COLORS[merit as keyof typeof MERIT_COLORS],
      description: `Peso: ${(meritWeight * 100).toFixed(2)}%`,
      children: []
    };

    // Adicionar subcritérios
    for (let i = 1; i <= 5; i++) {
      const subCode = `${merit}${i}`;
      const subWeight = subWeights[subCode] || 0;
      
      const subNode: HierarchyNode = {
        name: subCode,
        value: subWeight * meritWeight, // Peso composto
        color: MERIT_COLORS[merit as keyof typeof MERIT_COLORS],
        description: `Peso local: ${(subWeight * 100).toFixed(2)}%\nPeso global: ${(subWeight * meritWeight * 100).toFixed(2)}%`,
        children: []
      };

      // Adicionar alternativas (se houver)
      const altScores = finalScores[subCode] || {};
      Object.entries(altScores).forEach(([alt, score]) => {
        subNode.children?.push({
          name: alt,
          value: (score as number) * subWeight * meritWeight,
          color: MERIT_COLORS[merit as keyof typeof MERIT_COLORS],
          description: `Score: ${((score as number) * 100).toFixed(2)}%`
        });
      });

      meritNode.children?.push(subNode);
    }

    root.children?.push(meritNode);
  });

  return root;
}

// ============================================================
// COMPONENTE
// ============================================================

export default function BOCRHierarchyD3({ 
  calculation,
  width = 800,
  height = 800
}: BOCRHierarchyD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string>('BOCR');

  useEffect(() => {
    if (!svgRef.current || !calculation) return;

    // Limpar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    const radius = Math.min(width, height) / 2;
    const hierarchyData = processHierarchyData(calculation);

    // Criar hierarquia D3
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Criar partition layout
    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root as any);

    // Criar arco
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Criar SVG
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    // Criar grupo principal
    const g = svg.append('g');

    // Criar células (paths)
    const cell = g.selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('d', arc)
      .attr('fill', d => {
        const nodeData = d.data as HierarchyNode;
        if (nodeData.color) return nodeData.color;
        
        // Se não tiver cor definida, herdar do pai
        let ancestor: any = d;
        while (ancestor.depth > 1) {
          ancestor = ancestor.parent;
        }
        return (ancestor.data as HierarchyNode).color || '#6366f1';
      })
      .attr('fill-opacity', d => 
        d.depth === 1 ? 0.9 : 
        d.depth === 2 ? 0.7 : 
        0.5
      )
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill-opacity', 1)
          .attr('stroke-width', 3);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill-opacity', d.depth === 1 ? 0.9 : d.depth === 2 ? 0.7 : 0.5)
          .attr('stroke-width', 2);
      })
      .on('click', function(event, d) {
        setSelectedNode((d.data as HierarchyNode).name);
        
        // Zoom to clicked node
        const transition = svg.transition()
          .duration(750)
          .tween('scale', () => {
            const xd = d3.interpolate(0, d.x0);
            const yd = d3.interpolate(0, d.y0);
            const yr = d3.interpolate(0, d.y1);
            
            return (t: number) => {
              const x0 = xd(t);
              const y0 = yd(t);
              const y1 = yr(t);
              
              cell.attr('d', (node: any) => {
                const arcGen = d3.arc<any>()
                  .startAngle((node.x0 - x0) / (d.x1 - x0) * 2 * Math.PI)
                  .endAngle((node.x1 - x0) / (d.x1 - x0) * 2 * Math.PI)
                  .innerRadius((node.y0 - y0) / (y1 - y0) * radius)
                  .outerRadius((node.y1 - y0) / (y1 - y0) * radius);
                
                return arcGen(node);
              });
            };
          });
      });

    // Adicionar labels
    const label = g.selectAll('text')
      .data(root.descendants().filter(d => d.depth && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03))
      .join('text')
      .attr('transform', d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', d => d.depth === 1 ? '16px' : d.depth === 2 ? '12px' : '10px')
      .attr('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .text(d => (d.data as HierarchyNode).name);

    // Título central
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text('BOCR');

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', '14px')
      .attr('fill', '#6b7280')
      .text('Hierarquia de Pesos');

  }, [calculation, width, height]);

  function exportAsSVG() {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOCR-Hierarchy-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            🎯 Hierarquia BOCR Interativa (D3.js)
          </h3>
          <p className="text-gray-600">
            Visualização radial dos pesos estratégicos e subcritérios
          </p>
        </div>
        <button
          onClick={exportAsSVG}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar SVG
        </button>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: MERIT_COLORS.B }}></div>
            <div>
              <div className="font-semibold text-gray-900">Benefícios</div>
              <div className="text-xs text-gray-500">Impactos positivos</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: MERIT_COLORS.O }}></div>
            <div>
              <div className="font-semibold text-gray-900">Oportunidades</div>
              <div className="text-xs text-gray-500">Potencial futuro</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: MERIT_COLORS.C }}></div>
            <div>
              <div className="font-semibold text-gray-900">Custos</div>
              <div className="text-xs text-gray-500">Investimento necessário</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: MERIT_COLORS.R }}></div>
            <div>
              <div className="font-semibold text-gray-900">Riscos</div>
              <div className="text-xs text-gray-500">Potencial negativo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico D3 */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex justify-center">
          <svg ref={svgRef} className="w-full max-w-4xl" />
        </div>
        
        {selectedNode && selectedNode !== 'BOCR' && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="font-semibold text-indigo-900">
              Selecionado: {selectedNode}
            </div>
            <div className="text-sm text-indigo-700 mt-1">
              Clique em outro segmento para visualizar seus detalhes
            </div>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-5 h-5" />
          💡 Como usar a hierarquia:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Centro:</strong> BOCR (4 méritos principais)</li>
          <li>• <strong>Anel 1:</strong> Subcritérios (B1-B5, O1-O5, C1-C5, R1-R5)</li>
          <li>• <strong>Anel 2:</strong> Alternativas avaliadas</li>
          <li>• <strong>Tamanho:</strong> Proporcional ao peso/importância</li>
          <li>• <strong>Hover:</strong> Destaque visual do segmento</li>
          <li>• <strong>Click:</strong> Zoom no segmento selecionado</li>
        </ul>
      </div>

      {/* Nota Metodológica */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2">
          📚 Interpretação da Hierarquia
        </h4>
        <p className="text-sm text-purple-800">
          O sunburst diagram representa a hierarquia completa do modelo AHP-BOCR seguindo 
          Wijnmalen (2007). Cada segmento tem tamanho proporcional ao seu peso composto 
          (peso local × peso do pai). Cores distinguem os méritos BOCR, facilitando 
          identificação visual de onde está concentrado o valor da decisão.
        </p>
      </div>
    </div>
  );
}
