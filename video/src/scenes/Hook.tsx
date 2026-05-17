import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

const LINES = [
    { text: 'Une note de détail.',                from: 0,   to: 25 },
    { text: 'Deux heures de calcul.',             from: 30,  to: 60 },
    { text: 'Une erreur de TVA…',                 from: 70,  to: 110 },
    { text: 'Facture refusée.',                   from: 120, to: 160 },
];

export const HookScene: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.black,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 16,
                fontFamily: FONTS.sans,
            }}
        >
            {LINES.map((line, i) => {
                const op = interpolate(frame, [line.from, line.from + 6, line.to, line.to + 6], [0, 1, 1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });
                const y = interpolate(frame, [line.from, line.from + 8], [20, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });
                const isLast = i === LINES.length - 1;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            opacity: op,
                            transform: `translateY(${y}px)`,
                            fontSize: isLast ? 96 : 72,
                            fontWeight: isLast ? 900 : 700,
                            color: isLast ? COLORS.danger : COLORS.white,
                            textAlign: 'center',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {line.text}
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};
