import { AbsoluteFill, Sequence } from 'remotion';
import { COLORS, TIMELINE } from './theme';
import { LogoScene }      from './scenes/Logo';
import { HookScene }      from './scenes/Hook';
import { CarouselScene }  from './scenes/Carousel';
import { BenefitsScene }  from './scenes/Benefits';
import { CTAScene }       from './scenes/CTA';

type Orientation = 'landscape' | 'portrait';

export const SoftTransitPromo: React.FC<{ orientation?: Orientation }> = ({
    orientation = 'landscape',
}) => {
    return (
        <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
            <Sequence {...TIMELINE.logo}>
                <LogoScene />
            </Sequence>
            <Sequence {...TIMELINE.hook}>
                <HookScene />
            </Sequence>
            <Sequence {...TIMELINE.carousel}>
                <CarouselScene orientation={orientation} />
            </Sequence>
            <Sequence {...TIMELINE.benefits}>
                <BenefitsScene />
            </Sequence>
            <Sequence {...TIMELINE.cta}>
                <CTAScene />
            </Sequence>
        </AbsoluteFill>
    );
};
