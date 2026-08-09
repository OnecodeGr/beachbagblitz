# Beach Bag Blitz — Προτάσεις βελτίωσης

Ιδέες για επόμενες επαναλήψεις, ταξινομημένες χονδρικά από πιο απλές/φθηνές σε πιο μεγάλες αλλαγές.
Καμία δεν είναι απαραίτητη για το launch — το παιχνίδι είναι playable και ολοκληρωμένο όπως είναι.

## ✅ Υλοποιημένα

- ~~Ήχοι εφέ (ding/buzz)~~, ~~confetti burst~~, ~~haptic feedback~~, ~~preload ήχου/γραμματοσειρών~~ — done.
- ~~Leaderboard (Cloudflare KV, Today + All-time top 10, persistent player name/id, keep-best-score)~~ — done, δες `HANDOVER.md`.
- ~~Daily Challenge (seeded RNG, best of 3 προσπάθειες/μέρα, streak counter, countdown)~~ — done.
- ~~Daily-board cosmetic streak badge~~ (🔥N δίπλα στο όνομα στο leaderboard) — done.
- ~~Δυναμικό μήνυμα μοιράσματος με screenshot (canvas → Web Share API files)~~ — done.
- ~~Power-ups (extra ζωή 🛟, freeze-time ❄️ 3″)~~ — done.
- ~~Δυσκολία βασισμένη σε score-multiplier (Hard mode +30% πόντοι/catch)~~ — done.
- ~~Βασικό event tracking~~ (games started/completed, μέσο σκορ, share usage, ανά γλώσσα/δυσκολία) — done, δες `HANDOVER.md` (`/api/event`, `/api/stats`· το Cloudflare Web Analytics δεν υποστηρίζει custom events).
- ~~Daily Twist~~ (μικρή seeded-ανά-ημέρα gameplay παραλλαγή, Daily Challenge only: buff/debuff/νέο
  icon/active mechanic) — done, δες `HANDOVER.md`.

## Γρήγορες, χαμηλού κόστους

- **Ένα δεύτερο item ανά κατηγορία** (π.χ. 🧴 αντηλιακό στο Beach, ⌚ smartwatch στο Tech) για λίγο
  περισσότερη ποικιλία οπτικά, χωρίς αλλαγή μηχανικής.

## Gameplay depth

- **Boss/rush round** στα τελευταία 10″ όπου πέφτουν πολλά items ταυτόχρονα για ένταση στο τέλος.
- **Landscape/tablet layout** αν το analytics δείξει σημαντικό ποσοστό μη-κατακόρυφης χρήσης.

## Accessibility / πολιτισμικά σημεία

- **Reduced motion**: σεβασμός στο `prefers-reduced-motion` για να μειωθεί/απενεργοποιηθεί η
  κίνηση της ομπρέλας/combo animation σε όσους το έχουν ενεργό στο σύστημά τους.
- **Contrast check** σε μικρά κείμενα πάνω σε ανοιχτόχρωμο background (π.χ. bag labels) για να
  διασφαλιστεί ευαναγνωσιμότητα σε έντονο ηλιακό φως σε κινητή οθόνη (πολύ ρεαλιστικό σενάριο
  χρήσης, καλοκαίρι/παραλία!).
