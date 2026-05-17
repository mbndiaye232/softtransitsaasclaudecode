# 🎙️ Script voix-off — Vidéo promo Soft Transit (75 s)

## Méthode rapide

1. Aller sur https://elevenlabs.io → Speech Synthesis
2. Choisir une voix française (recommandations en bas)
3. **Coller le texte ci-dessous** (section "Texte à coller")
4. Régler les paramètres (section "Paramètres ElevenLabs")
5. Générer → télécharger MP3 → renommer en **`voiceover.mp3`**
6. Placer dans `video/public/voiceover.mp3`
7. Activer dans la vidéo (voir tout en bas)

---

## ✂️ Texte à coller dans ElevenLabs (75 s)

Copiez **tout le bloc ci-dessous d'un seul coup** (les "..." et "—" servent à doser les pauses, ElevenLabs les respecte) :

```
Soft Transit. La plateforme du transitaire moderne.

Une note de détail... deux heures de calcul... une erreur de TVA... facture refusée.

Soft Transit fait tout. Et le fait mieux.

Vos clients centralisés. Vos dossiers maritimes, aériens, terrestres. Vos notes de détail liquidées en trois minutes. Votre facturation, auto-remplie. Vos règlements suivis. Vos états financiers en temps réel. Vos ordres de transit prêts à imprimer.

Dix fois plus rapide. Zéro erreur de calcul. UEMOA, CEDEAO, CEMAC, et tous les autres pays.

Réservez votre démo gratuite. Trente minutes, en français ou en wolof.

softtransit point net slash demo.

Sans carte bancaire. Réponse sous vingt-quatre heures.
```

---

## 🎛️ Paramètres ElevenLabs recommandés

| Paramètre | Valeur | Raison |
|---|---|---|
| **Model** | `Eleven Multilingual v2` ou `v3` | Meilleur français |
| **Stability** | 45-50 | Ton constant mais expressif |
| **Similarity** | 75-80 | Voix naturelle, peu robotique |
| **Style exaggeration** | 30-40 | Donne de l'énergie au pitch |
| **Speaker boost** | ✅ activé | Clarté audio |
| **Speed** | 1.0× (ou 1.05× max) | Le script tient déjà en 75s à vitesse normale |

## 🎤 Voix françaises recommandées (gratuites sur ElevenLabs)

| Voix | Style | Pour qui |
|---|---|---|
| **Antoine** | Masculine, posée, professionnelle | ✅ Recommandé — ton corporate clair |
| **Charles** | Masculine, énergique | Si vous voulez un côté plus "punchy" |
| **Léa** | Féminine, chaleureuse | Alternative féminine moderne |
| **Sarah** | Féminine, claire | Plus formelle |

**Mon choix par défaut** : `Antoine` à 1.0× — il sonne crédible pour un produit B2B.

---

## ⏱️ Timing détaillé (pour vérifier la synchro avec la vidéo)

Si la durée totale dépasse 75 secondes, **régénérez avec speed = 1.08×** ou raccourcissez le texte.

| Temps vidéo | Texte voix-off | Scène à l'écran |
|---|---|---|
| 0:00-0:05 | "Soft Transit. La plateforme du transitaire moderne." | Logo SST |
| 0:05-0:12 | "Une note de détail... deux heures de calcul... une erreur de TVA... facture refusée." | Hook texte rouge |
| 0:12-0:14 | "Soft Transit fait tout. Et le fait mieux." | (entre hook et carrousel) |
| 0:14-0:48 | "Vos clients centralisés. Vos dossiers... [énumération]" | Carrousel 10 écrans |
| 0:48-0:60 | "Dix fois plus rapide. Zéro erreur..." | Bénéfices chiffrés |
| 0:60-0:75 | "Réservez votre démo... softtransit point net slash demo..." | CTA + URL |

---

## 🌍 Variantes pour autres marchés

### 🇬🇧 Version anglaise (à coller dans ElevenLabs avec une voix anglaise)

```
Soft Transit. The platform for the modern customs broker.

A customs note... two hours of calculations... one VAT error... invoice rejected.

Soft Transit does it all. And does it better.

Your clients centralized. Your maritime, air, and road shipments. Your customs notes processed in three minutes. Your invoicing, auto-filled. Your payments tracked. Your financial reports in real time. Your transit orders ready to print.

Ten times faster. Zero calculation errors. ECOWAS, CEMAC, and every other country.

Book your free demo. Thirty minutes, in French or English.

softtransit dot net slash demo.

No credit card. Reply within twenty-four hours.
```

### 🇸🇳 Version bilingue français/wolof

> ⚠️ À faire enregistrer par un **locuteur natif wolof**, pas par IA (l'IA wolof n'existe pas encore en qualité acceptable sur ElevenLabs).

Trame proposée (à valider/réécrire par un wolofone) :

```
[FR] Soft Transit. [WO] Mooy app bi.

[WO] Ñaari waxtu ngir def benn note de détail. [FR] Une erreur, et la facture est refusée.

[FR] Soft Transit le fait en trois minutes. [WO] Te amul njuumte.

...
```

---

## 🎵 Ajouter une musique de fond (optionnel)

1. Télécharger une piste libre de droits sur **Pixabay Music** ou **YouTube Audio Library**
2. Style recommandé : "corporate uplifting" ou "tech minimal", **BPM 100-120**
3. Renommer en `music.mp3` → placer dans `video/public/`
4. Activer dans la vidéo (voir ci-dessous)

---

## 🔧 Activer la voix-off dans le projet Remotion

Une fois `voiceover.mp3` placé dans `public/`, ouvrir **`src/Video.tsx`** et remplacer :

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
```

Par :

```tsx
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
```

Puis ajouter en tout premier dans le JSX, juste après `<AbsoluteFill ...>` :

```tsx
{/* Voix-off (75s) */}
<Audio src={staticFile('voiceover.mp3')} />

{/* Musique de fond optionnelle, volume bas */}
<Audio src={staticFile('music.mp3')} volume={0.12} />
```

Sauvegarder. Le `npm start` (mode studio) la prend en compte instantanément.

---

## ✅ Checklist finale avant render

- [ ] `public/logo-sst.png` (votre logo SST)
- [ ] `public/voiceover.mp3` (75s, voix française)
- [ ] `public/music.mp3` (optionnel)
- [ ] 10 captures déjà copiées par `copy-assets.bat`
- [ ] `theme.ts` : numéro WhatsApp réel renseigné
- [ ] Preview validé via `npm start`
- [ ] `npm run render` → MP4 final
