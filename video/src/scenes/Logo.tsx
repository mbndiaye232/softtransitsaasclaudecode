import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../theme';

export const LogoScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Logo : scale-in spring 0-25 frames, hold, fade-out 130-150 frames
    const scale = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
    const opacity = interpolate(frame, [130, 150], [1, 0], { extrapolateRight: 'clamp' });

    // Sous-titre : slide-up à partir de frame 25
    const subFrame = Math.max(0, frame - 25);
    const subY = interpolate(subFrame, [0, 20], [40, 0], { extrapolateRight: 'clamp' });
    const subOp = interpolate(subFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill
            style={{
                backgroundColor: COLORS.white,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 40,
                opacity,
            }}
        >
            <Img
                src={staticFile('logo-sst.png')}
                style={{ width: 360, height: 360, transform: `scale(${scale})` }}
            />
            <div
                style={{
                    transform: `translateY(${subY}px)`,
                    opacity: subOp,
                    textAlign: 'center',
                    fontFamily: FONTS.sans,
                }}
            >
                <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.blueDark, letterSpacing: '-0.02em' }}>
                    Soft Transit
                </div>
                <div style={{ fontSize: 22, color: COLORS.muted, marginTop: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    La plateforme du transitaire moderne
                </div>
            </div>
        </AbsoluteFill>
    );
};
