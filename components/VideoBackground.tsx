'use client';

/**
 * Background com vídeo industrial em loop.
 * Fallback: gradiente sólido (definido no pai) se o vídeo não carregar.
 */
export const VideoBackground = () => (
    <>
        {/* Vídeo de fundo */}
        <video
            autoPlay
            muted
            loop
            playsInline
            className="fixed inset-0 w-full h-full object-cover z-0"
            poster=""
        >
            <source src="/bg-video.mp4" type="video/mp4" />
        </video>
        {/* Overlay escuro para legibilidade */}
        <div
            className="fixed inset-0"
            style={{
                zIndex: 1,
                background: 'linear-gradient(135deg, rgba(15,23,42,0.80) 0%, rgba(30,27,75,0.70) 50%, rgba(15,23,42,0.80) 100%)',
            }}
        />
    </>
);
