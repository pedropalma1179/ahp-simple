// components/ChartExportWrapper.tsx
// Wrapper para export de gráficos em TIFF/PNG 300 DPI
// Para uso acadêmico em dissertações e artigos

'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface ChartExportWrapperProps {
    children: React.ReactNode;
    filename: string;
    title?: string;
    className?: string;
}

const DPI_SCALE = 300 / 96; // ≈ 3.125 para 300 DPI

// Encoder TIFF simplificado (RGB, sem compressão)
function encodeTIFF(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    dpi: number = 300
): ArrayBuffer {
    // Converter RGBA → RGB (fundo branco)
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        const a = rgba[i * 4 + 3] / 255;
        rgb[i * 3] = Math.round(rgba[i * 4] * a + 255 * (1 - a));
        rgb[i * 3 + 1] = Math.round(rgba[i * 4 + 1] * a + 255 * (1 - a));
        rgb[i * 3 + 2] = Math.round(rgba[i * 4 + 2] * a + 255 * (1 - a));
    }

    const imageSize = width * height * 3;
    const ifdOffset = 8;
    const ifdEntries = 14;
    const ifdSize = 2 + ifdEntries * 12 + 4;
    const bpsOffset = ifdOffset + ifdSize;
    const dpiOffset = bpsOffset + 6;
    const imageOffset = dpiOffset + 16;
    const totalSize = imageOffset + imageSize;

    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);
    const arr = new Uint8Array(buf);

    // TIFF Header (little-endian)
    view.setUint16(0, 0x4949, false); // 'II'
    view.setUint16(2, 42, true);
    view.setUint32(4, ifdOffset, true);

    let offset = ifdOffset;
    view.setUint16(offset, ifdEntries, true);
    offset += 2;

    const writeEntry = (tag: number, type: number, count: number, value: number) => {
        view.setUint16(offset, tag, true); offset += 2;
        view.setUint16(offset, type, true); offset += 2;
        view.setUint32(offset, count, true); offset += 4;
        view.setUint32(offset, value, true); offset += 4;
    };

    // IFD Entries (ascending order)
    writeEntry(254, 4, 1, 0);              // NewSubfileType
    writeEntry(256, 4, 1, width);          // ImageWidth
    writeEntry(257, 4, 1, height);         // ImageLength
    writeEntry(258, 3, 3, bpsOffset);      // BitsPerSample → pointer
    writeEntry(259, 3, 1, 1);              // Compression: None
    writeEntry(262, 3, 1, 2);              // PhotometricInterpretation: RGB
    writeEntry(273, 4, 1, imageOffset);    // StripOffsets
    writeEntry(274, 3, 1, 1);              // Orientation: TopLeft
    writeEntry(277, 3, 1, 3);              // SamplesPerPixel
    writeEntry(278, 4, 1, height);         // RowsPerStrip
    writeEntry(279, 4, 1, imageSize);      // StripByteCounts
    writeEntry(282, 5, 1, dpiOffset);      // XResolution
    writeEntry(283, 5, 1, dpiOffset + 8);  // YResolution
    writeEntry(296, 3, 1, 2);              // ResolutionUnit: inch

    view.setUint32(offset, 0, true); // Next IFD = 0

    // BitsPerSample (8, 8, 8)
    view.setUint16(bpsOffset, 8, true);
    view.setUint16(bpsOffset + 2, 8, true);
    view.setUint16(bpsOffset + 4, 8, true);

    // DPI rationals
    view.setUint32(dpiOffset, dpi, true);
    view.setUint32(dpiOffset + 4, 1, true);
    view.setUint32(dpiOffset + 8, dpi, true);
    view.setUint32(dpiOffset + 12, 1, true);

    // Image data
    arr.set(rgb, imageOffset);

    return buf;
}

async function captureChart(element: HTMLElement): Promise<HTMLCanvasElement> {
    return html2canvas(element, {
        scale: DPI_SCALE,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
    });
}

export default function ChartExportWrapper({
    children,
    filename,
    title,
    className
}: ChartExportWrapperProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [copying, setCopying] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const handleCopy = async () => {
        if (!chartRef.current || copying) return;
        setCopying(true);
        try {
            const canvas = await captureChart(chartRef.current);
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    showFeedback('Erro ao copiar');
                    setCopying(false);
                    return;
                }
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    showFeedback('✓ Copiado!');
                } catch {
                    // Fallback: abrir em nova aba
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    showFeedback('Aberto em nova aba');
                }
                setCopying(false);
            }, 'image/png');
        } catch (err) {
            console.error('Erro ao copiar:', err);
            showFeedback('Erro ao copiar');
            setCopying(false);
        }
    };

    const handleDownload = async () => {
        if (!chartRef.current || downloading) return;
        setDownloading(true);
        try {
            const canvas = await captureChart(chartRef.current);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                showFeedback('Erro ao capturar');
                setDownloading(false);
                return;
            }

            const width = canvas.width;
            const height = canvas.height;
            const imageData = ctx.getImageData(0, 0, width, height);

            try {
                // Tentar TIFF
                const tiffData = encodeTIFF(imageData.data, width, height, 300);
                const blob = new Blob([tiffData], { type: 'image/tiff' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}_300dpi.tiff`;
                a.click();
                URL.revokeObjectURL(url);
                showFeedback('✓ TIFF baixado!');
            } catch {
                // Fallback: PNG
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}_300dpi.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showFeedback('✓ PNG baixado!');
                }, 'image/png');
            }
        } catch (err) {
            console.error('Erro ao baixar:', err);
            showFeedback('Erro ao baixar');
        }
        setDownloading(false);
    };

    return (
        <div className={`relative group ${className || ''}`}>
            {/* Botões aparecem no hover (e sempre em mobile via focus-within) */}
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex gap-1">
                <button
                    onClick={handleCopy}
                    disabled={copying}
                    className="p-1.5 bg-white/90 hover:bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    title={`Copiar ${title || 'gráfico'} (PNG)`}
                >
                    {copying ? '⏳' : '📋'}
                </button>
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="p-1.5 bg-white/90 hover:bg-white border border-gray-200 rounded-lg shadow-sm text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    title={`Download ${title || 'gráfico'} (TIFF 300 DPI)`}
                >
                    {downloading ? '⏳' : '📥'}
                </button>
            </div>

            {/* Feedback toast */}
            {feedback && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-gray-900 text-white text-xs rounded-full shadow-lg">
                    {feedback}
                </div>
            )}

            {/* Conteúdo do gráfico */}
            <div ref={chartRef}>
                {children}
            </div>
        </div>
    );
}
