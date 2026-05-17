import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../theme';

const BENEFITS = [
    { stat: '10×',  label: 'plus rapide',          accent: COLORS.blueAccent },
    { stat: '0',    label: 'erreur de calcul',     accent: COLORS.success    },
    { stat: 'UEMOA·CEDEAO·CEMAC·RDC', label: 'TEC personnalisable',          accent: COLORS.warning, big: false },
];

const STAGGER = 50; // frames entre chaque bénéfice

export const BenefitsScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)`,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 60,
                fontFamily: FONTS.sans,
                padding: 80,
                flexWrap: 'wrap',
            }}
        >
            {BENEFITS.map((b, i) => {
                const start = i * STAGGER;
                const enter = spring({
                    frame: frame - start,
                    fps,
                    config: { damping: 14, stiffness: 100 },
                });
                const op = interpolate(frame, [start, start + 8], [0, 1], { extrapolateRight: 'clamp' });

                return (
                    <div
                        key={i}
                        style={{
                            textAlign: 'center',
                            transform: `scale(${enter})`,
                            opacity: op,
                            minWidth: 360,
                        }}
                    >
                        <div
                            style={{
                                fontSize: b.big === false ? 56 : 180,
                                fontWeight: 900,
                                color: b.accent,
                                lineHeight: 1,
                                letterSpacing: '-0.04em',
                                textShadow: `0 6px 30px ${b.accent}55`,
                            }}
                        >
                            {b.stat}
                        </div>
                        <div
                            style={{
                                fontSize: 28,
                                fontWeight: 700,
                                color: COLORS.white,
                                marginTop: 12,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {b.label}
                        </div>
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};
