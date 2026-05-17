# 🎬 Vidéo promo Soft Transit (Remotion)

Vidéo de 75 secondes générée par code, à partir des captures d'écran de l'application.

## 📦 Pré-requis

- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- Environ **2 Go d'espace disque** (Remotion télécharge Chrome headless pour le rendu)

## 🚀 Démarrage rapide

```powershell
cd C:\softtransitsaasclaudecode\video

# 1. Copier les screenshots et le logo SST
copy-assets.bat

# /!\ Placer manuellement votre logo en PNG ici :
#    video\public\logo-sst.png   (idéalement 500×500, fond transparent)

# 2. Installer les dépendances (~3 min la première fois)
npm install

# 3a. Mode studio (preview interactif dans le navigateur)
npm start

# 3b. Render direct → out\softtransit-promo.mp4 (~5 min)
npm run render

# 3c. Version verticale 9:16 (WhatsApp Status / Reels)
npm run render-vertical
```

## 🧩 Structure des scènes

| Temps | Scène | Fichier |
|-------|-------|---------|
| 0-5s  | Logo SST + signature                              | `src/scenes/Logo.tsx` |
| 5-12s | Hook douleur (texte sur fond noir)                | `src/scenes/Hook.tsx` |
| 12-50s| Carrousel de 10 écrans (Ken Burns + titre/sous-titre) | `src/scenes/Carousel.tsx` |
| 50-60s| 3 bénéfices chiffrés (animation spring)           | `src/scenes/Benefits.tsx` |
| 60-75s| CTA final : `softtransit.net/demo` + logo + sous-texte | `src/scenes/CTA.tsx` |

## 🎨 Personnaliser

**Couleurs / texte commun** → `src/theme.ts`
- `COLORS.blue` = bleu principal SST
- `URL` = `softtransit.net/demo`
- `TIMELINE` = durées de chaque scène en frames

**Modifier les écrans du carrousel** → `src/scenes/Carousel.tsx`, tableau `SLIDES[]`. Pour chaque slide :
```ts
{ img: 'NomFichier.png', title: 'Titre', subtitle: 'Sous-titre' }
```
Le fichier doit exister dans `public/` (`copy-assets.bat` les copie depuis `../screenshots/`).

**Bénéfices** → `src/scenes/Benefits.tsx`, tableau `BENEFITS[]`.

**Texte du CTA** → `src/scenes/CTA.tsx`.

## 🎙️ Ajouter la voix-off

1. Générer une piste audio (ex. ElevenLabs) → `public\voiceover.mp3`
2. Dans `src/Video.tsx`, ajouter en haut du composant :
```tsx
import { Audio, staticFile } from 'remotion';
// dans le JSX, après <AbsoluteFill> :
<Audio src={staticFile('voiceover.mp3')} />
```

## 🎵 Ajouter une musique de fond

Idem que la voix-off, avec un `volume={0.15}` pour ne pas couvrir la voix :
```tsx
<Audio src={staticFile('music.mp3')} volume={0.15} />
```

## 📤 Export final

Le MP4 est produit dans `out/`. Pour le compresser pour LinkedIn (max 200 Mo) :
```powershell
# Si vous avez ffmpeg installé
ffmpeg -i out\softtransit-promo.mp4 -vcodec libx264 -crf 28 out\softtransit-promo-light.mp4
```

## ❓ Dépannage

| Problème | Solution |
|----------|----------|
| `Cannot find module 'X'` | `npm install` |
| Render lent | Réduire `--concurrency` à 1 dans `package.json` |
| Image floue dans le carrousel | Capture trop petite — refaire en 1920×1080 minimum |
| Logo cassé | Vérifier que `public\logo-sst.png` existe |
