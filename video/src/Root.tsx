import { Composition } from 'remotion';
import { SoftTransitPromo } from './Video';

const FPS = 30;
const DURATION_FRAMES = 75 * FPS; // 75 seconds

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* 16:9 — LinkedIn / YouTube / site web */}
            <Composition
                id="SoftTransitPromo"
                component={SoftTransitPromo}
                durationInFrames={DURATION_FRAMES}
                fps={FPS}
                width={1920}
                height={1080}
                defaultProps={{ orientation: 'landscape' as const }}
            />
            {/* 9:16 — WhatsApp Status / Reels / Stories */}
            <Composition
                id="SoftTransitPromoVertical"
                component={SoftTransitPromo}
                durationInFrames={DURATION_FRAMES}
                fps={FPS}
                width={1080}
                height={1920}
                defaultProps={{ orientation: 'portrait' as const }}
            />
        </>
    );
};
