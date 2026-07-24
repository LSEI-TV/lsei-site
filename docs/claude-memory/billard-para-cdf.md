---
name: billard-para-cdf
description: "Le Championnat de France de para-billard officiel ne commence qu'en 2025/2026 (info métier donnée par le user)"
metadata: 
  node_type: memory
  type: project
  originSessionId: da21c2bc-82e6-4514-9030-dcc992a759ea
  modified: 2026-07-24T12:40:59.523Z
---

**Para-billard uniquement** : le premier **Championnat de France reconnu par les instances** est celui de **2025/2026**. Les « Championnat de France » des saisons antérieures (2023/2024, 2024/2025) étaient en réalité des **tournois de promotion** organisés en marge des autres catégories du championnat — **pas un titre officiel**.

**Why:** info métier non déductible des données (les JSON les nommaient « CHF … PROMOTION » mais avec `kind:'france'`). Le user l'a signalée car la fiche de Yvan Carric affichait « 2 titres » à tort.

**How to apply:** codé dans `src/data/billard/seasonsPara.ts` via `PARA_CDF_FROM_SEASON = '2025-2026'` :
- `getParaPalmares()` garde le CdF mais le marque `cdfPromo:true` avant cette saison ;
- la fiche `para-billard/joueur/[id].astro` affiche alors une entrée « **Champion de France · promotion** » (icône 🎖️, style `.promo` pointillé) qui **apparaît au palmarès mais N'EST PAS comptée** dans le nombre de titres officiels (`officialTitles`) ;
- `paraCal()` relabelle les CdF antérieurs en « CHF · promotion » dans le calendrier.
Ne concerne QUE le para (Masters/Femmes gardent leur CdF via [[billard-import-historique]] / `palmaresOf`). Si de nouvelles saisons para sont ajoutées, cette règle reste valable pour tout ce qui précède 2025/2026.
