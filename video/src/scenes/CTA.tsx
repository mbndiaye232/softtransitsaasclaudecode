import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, URL } from '../theme';

export const CTAScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Apparitions échelonnées
    const logoScale = spring({ frame, fps, config: { damping: 13, stiffness: 110 } });
    const headlineOp = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });
    const headlineY  = interpolate(frame, [10, 25], [40, 0], { extrapolateRight: 'clamp' });
    const urlOp      = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' });
    const urlScale   = spring({ frame: frame - 35, fps, config: { damping: 12, stiffness: 130 } });
    const subOp      = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: 'clamp' });

    // Pulsation douce du bouton URL
    const pulse = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2);

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.blueLight} 100%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.sans,
                gap: 40,
            }}
        >
            <Img
                src={staticFile('logo-sst.png')}
                style={{ width: 140, height: 140, transform: `scale(${logoScale})` }}
            />

            <div
                style={{
                    fontSize: 64,
                    fontWeight: 900,
                    color: COLORS.blueDark,
                    letterSpacing: '-0.025em',
                    textAlign: 'center',
                    opacity: headlineOp,
                    transform: `translateY(${headlineY}px)`,
                    maxWidth: 1400,
                    lineHeight: 1.1,
                }}
            >
                Réservez votre démo gratuite
                <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.dark, marginTop: 10 }}>
                    30 minutes en français ou wolof
                </div>
            </div>

            <div
                style={{
                    background: COLORS.blue,
                    color: COLORS.white,
                    padding: '28px 56px',
                    borderRadius: 24,
                    fontSize: 56,
                    fontWeight: 900,
                    letterSpacing: '-0.01em',
                    opacity: urlOp,
                    transform: `scale(${urlScale * pulse})`,
                    boxShadow: `0 20px 50px ${COLORS.blue}66`,
                }}
            >
                {URL}
            </div>

            <div
                style={{
                    opacity: subOp,
                    fontSize: 22,
                    color: COLORS.muted,
                    textAlign: 'center',
                    fontWeight: 600,
                    marginTop: 20,
                }}
            >
                ✓ Sans carte bancaire   ·   ✓ Réponse sous 24h   ·   ✓ 5 % de réduction pour les 10 premiers
            </div>
        </AbsoluteFill>
    );
};
