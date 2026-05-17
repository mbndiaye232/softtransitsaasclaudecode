/**
 * Charte graphique Soft Transit / SST
 */
export const COLORS = {
    blue:       '#1d4ed8',  // primaire
    blueDark:   '#1e3a8a',  // navy (logo SST)
    blueLight:  '#eff6ff',  // backgrounds très clairs
    blueAccent: '#3b82f6',  // accent
    white:      '#ffffff',
    black:      '#0f172a',
    dark:       '#1e293b',
    muted:      '#94a3b8',
    success:    '#16a34a',
    warning:    '#f59e0b',
    danger:     '#dc2626',
};

export const FONTS = {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export const URL    = 'softtransit.net/demo';
export const PHONE  = '+221 77 XXX XX XX'; // ⚠️ Remplacer par votre WhatsApp Business

/**
 * Timeline (frames @ 30fps) — durée 75s
 * Permet de modifier les durées à un seul endroit.
 */
export const FPS = 30;
export const TIMELINE = {
    logo:     { from: 0,        duration: 5  * FPS }, // 0-5s
    hook:     { from: 5  * FPS, duration: 7  * FPS }, // 5-12s
    carousel: { from: 12 * FPS, duration: 38 * FPS }, // 12-50s
    benefits: { from: 50 * FPS, duration: 10 * FPS }, // 50-60s
    cta:      { from: 60 * FPS, duration: 15 * FPS }, // 60-75s
} as const;
