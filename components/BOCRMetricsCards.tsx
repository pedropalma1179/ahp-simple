// components/BOCRMetricsCards.tsx
// Cards BOCR com Design System v3.0 - Bento Style
// Features: Micro-interações, Typography as Hero, Colored Shadows

'use client';

import React, { useState, useEffect } from 'react';

interface BOCRMetricsCardsProps {
  bocrWeights: number[];
  showDescriptions?: boolean;
}

// Animated number component
const AnimatedValue: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 800;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [value, isVisible]);

  return (
    <span className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {displayValue.toFixed(1)}%
    </span>
  );
};

export default function BOCRMetricsCards({ 
  bocrWeights, 
  showDescriptions = true 
}: BOCRMetricsCardsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metrics = [
    {
      index: 0,
      key: 'B',
      label: 'Benefícios',
      shortLabel: 'Benefits',
      icon: '↑',
      description: 'Ganhos imediatos e tangíveis',
      color: '#10B981',
      bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 50%)',
      shadowColor: 'rgba(16, 185, 129, 0.25)',
      hoverBg: '#ECFDF5',
    },
    {
      index: 1,
      key: 'O',
      label: 'Oportunidades',
      shortLabel: 'Opportunities',
      icon: '◈',
      description: 'Potencial estratégico futuro',
      color: '#F59E0B',
      bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 50%)',
      shadowColor: 'rgba(245, 158, 11, 0.25)',
      hoverBg: '#FFFBEB',
    },
    {
      index: 2,
      key: 'C',
      label: 'Custos',
      shortLabel: 'Costs',
      icon: '↓',
      description: 'Investimentos necessários',
      color: '#EF4444',
      bgGradient: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 50%)',
      shadowColor: 'rgba(239, 68, 68, 0.25)',
      hoverBg: '#FEF2F2',
    },
    {
      index: 3,
      key: 'R',
      label: 'Riscos',
      shortLabel: 'Risks',
      icon: '◇',
      description: 'Incertezas identificadas',
      color: '#F97316',
      bgGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 50%)',
      shadowColor: 'rgba(249, 115, 22, 0.25)',
      hoverBg: '#FFF7ED',
    },
  ];

  return (
    <div 
      className="grid gap-4 stagger-children"
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}
    >
      {metrics.map((metric, idx) => {
        const weight = bocrWeights[metric.index] || 0;
        const percentage = weight * 100;
        const isHovered = hoveredIndex === idx;

        return (
          <div 
            key={metric.key}
            className="relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer"
            style={{
              background: metric.bgGradient,
              borderLeft: `4px solid ${metric.color}`,
              boxShadow: isHovered 
                ? `0 8px 24px -4px ${metric.shadowColor}, 0 0 0 1px rgba(0,0,0,0.05)`
                : '0 1px 3px 0 rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
              transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
              padding: '1.5rem',
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Progress bar background */}
            <div 
              className="absolute bottom-0 left-0 h-1 transition-all duration-500"
              style={{
                width: isHovered ? '100%' : '0%',
                backgroundColor: metric.color,
              }}
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span 
                className="text-xl transition-transform duration-300"
                style={{ 
                  color: metric.color,
                  transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {metric.icon}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {metric.shortLabel}
              </span>
            </div>

            {/* Hero number */}
            <p
              className="font-mono text-4xl font-bold tracking-tight mb-1"
              style={{ color: metric.color }}
            >
              <AnimatedValue value={percentage} delay={100 + idx * 100} />
            </p>

            {/* Label */}
            <p className="text-base font-medium text-slate-800 mb-1">
              {metric.label}
            </p>

            {/* Description */}
            {showDescriptions && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {metric.description}
              </p>
            )}

            {/* Weight value */}
            <p className="text-xs font-mono text-slate-400 mt-3">
              w = {weight.toFixed(4)}
            </p>
          </div>
        );
      })}

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div.grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div.grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
