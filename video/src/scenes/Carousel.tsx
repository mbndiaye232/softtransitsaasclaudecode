import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';

/**
 * Carrousel d'écrans. Chaque slide :
 *  - 3,8s à l'écran (114 frames @ 30fps)
 *  - Fade + scale léger (Ken Burns) pour donner du mouvement
 *  - Texte titre + sous-titre slide depuis la gauche
 */
type Slide = { img: string; title: string; subtitle: string };

const SLIDES: Slide[] = [
    { img: 'EcranAccueil.png',          title: 'Accueil',                subtitle: 'Tableau de bord temps réel' },
    { img: 'EcranClient.png',           title: 'Clients & NINEA',        subtitle: 'Carnet d\'adresses centralisé' },
    { img: 'EcranDossiers.png',         title: 'Dossiers',               subtitle: 'Maritime · Aérien · Terrestre' },
    { img: 'EranNoteDetails.png',       title: 'Notes de détail',        subtitle: 'Liquidation en 3 minutes' },
    { img: 'EcranFacturation.png',      title: 'Facturation',            subtitle: 'Auto-remplie depuis les notes' },
    { img: 'EcranReglements.png',       title: 'Règlements',             subtitle: 'Suivi des encaissements' },
    { img: 'EcranSuiviTraitements.png', title: 'Suivi des traitements',  subtitle: 'Urgence calculée automatiquement' },
    { img: 'EcranEtatsFinanciers.png',  title: 'États financiers',       subtitle: 'CA · Encours · Balance âgée' },
    { img: 'EcranOT.png',               title: 'Ordres de Transit',      subtitle: 'Documents OT prêts à imprimer' },
    { img: 'EcranParametresSysteme.png',title: 'Multi-utilisateurs',     subtitle: 'Permissions fines par module' },
];

const SLIDE_DURATION = 114; // frames

export const CarouselScene: React.FC<{ orientation: 'landscape' | 'portrait' }> = ({ orientation }) => {
    const frame = useCurrentFrame();
    const total = SLIDE_DURATION * SLIDES.length;
    const clamped = Math.min(frame, total - 1);

    return (
        <AbsoluteFill style={{ backgroundColor: COLORS.blueDark }}>
            {SLIDES.map((slide, i) => {
                const start = i * SLIDE_DURATION;
                const end = start + SLIDE_DURATION;
                if (clamped < start || clamped >= end) return null;

                const local = clamped - start;
                const opacity = interpolate(local, [0, 8, SLIDE_DURATION - 12, SLIDE_DURATION], [0, 1, 1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });
                // Ken Burns : zoom léger 1 → 1.08
                const scale = interpolate(local, [0, SLIDE_DURATION], [1, 1.08]);
                // Slide-in du panneau texte depuis la gauche
                const panelX = interpolate(local, [0, 14], [-100, 0], { extrapolateRight: 'clamp' });
                const panelOp = interpolate(local, [0, 14, SLIDE_DURATION - 12, SLIDE_DURATION], [0, 1, 1, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });

                return (
                    <AbsoluteFill key={i} style={{ opacity }}>
                        {/* Capture d'écran en plein cadre, légèrement zoomée */}
                        <Img
                            src={staticFile(slide.img)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                transform: `scale(${scale})`,
                                filter: 'brightness(0.92)',
                            }}
                        />

                        {/* Overlay gradient pour faire ressortir le texte */}
                        <AbsoluteFill
                            style={{
                                background:
                                    orientation === 'portrait'
                                        ? 'linear-gradient(180deg, rgba(15,23,42,0) 50%, rgba(15,23,42,0.92) 100%)'
                                        : 'linear-gradient(90deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.55) 35%, rgba(15,23,42,0) 60%)',
                            }}
                        />

                        {/* Panneau texte */}
                        <AbsoluteFill
                            style={{
                                alignItems: orientation === 'portrait' ? 'center' : 'flex-start',
                                justifyContent: orientation === 'portrait' ? 'flex-end' : 'center',
                                padding: orientation === 'portrait' ? '0 60px 180px' : '0 0 0 100px',
                                fontFamily: FONTS.sans,
                                opacity: panelOp,
                                transform: `translateX(${panelX}px)`,
                            }}
                        >
                            <div
                                style={{
                                    background: COLORS.blue,
                                    color: COLORS.white,
                                    fontSize: 16,
                                    fontWeight: 800,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    padding: '6px 14px',
                                    borderRadius: 999,
                                    marginBottom: 18,
                                    display: 'inline-block',
                                }}
                            >
                                {String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
                            </div>
                            <div
                                style={{
                                    fontSize: orientation === 'portrait' ? 64 : 84,
                                    fontWeight: 900,
                                    color: COLORS.white,
                                    letterSpacing: '-0.025em',
                                    lineHeight: 1.05,
                                    textShadow: '0 4px 20px rgba(0,0,0,0.6)',
                                    textAlign: orientation === 'portrait' ? 'center' : 'left',
                                }}
                            >
                                {slide.title}
                            </div>
                            <div
                                style={{
                                    fontSize: orientation === 'portrait' ? 28 : 32,
                                    fontWeight: 500,
                                    color: COLORS.blueLight,
                                    marginTop: 12,
                                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                    textAlign: orientation === 'portrait' ? 'center' : 'left',
                                }}
                            >
                                {slide.subtitle}
                            </div>
                        </AbsoluteFill>
                    </AbsoluteFill>
                );
            })}
        </AbsoluteFill>
    );
};
