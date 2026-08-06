# Beach Bag Blitz — Προτάσεις βελτίωσης

Ιδέες για επόμενες επαναλήψεις, ταξινομημένες χονδρικά από πιο απλές/φθηνές σε πιο μεγάλες αλλαγές.
Καμία δεν είναι απαραίτητη για το launch — το παιχνίδι είναι playable και ολοκληρωμένο όπως είναι.

## ✅ Υλοποιημένα

- ~~Ήχοι εφέ (ding/buzz)~~, ~~confetti burst~~, ~~haptic feedback~~, ~~preload ήχου/γραμματοσειρών~~ — done.
- ~~Leaderboard (Cloudflare KV, Today + All-time top 10, persistent player name/id)~~ — done, δες `HANDOVER.md`.
- ~~Daily Challenge (seeded RNG, 1 προσπάθεια/μέρα, streak counter, countdown)~~ — done.
- ~~Δυναμικό μήνυμα μοιράσματος με screenshot (canvas → Web Share API files)~~ — done.

## Γρήγορες, χαμηλού κόστους

- **Ένα δεύτερο item ανά κατηγορία** (π.χ. 🧴 αντηλιακό στο Beach, ⌚ smartwatch στο Tech) για λίγο
  περισσότερη ποικιλία οπτικά, χωρίς αλλαγή μηχανικής.

## Engagement / retention

- **Daily-board cosmetic badges**: μικρό emoji/badge δίπλα στο όνομα στο leaderboard για όποιον
  έχει μεγάλο streak — καθαρά επίδειξη, καμία λειτουργική αξία, φθηνό engagement hook.

## Gameplay depth

- **Power-ups**: π.χ. ένα σπάνιο flamingo float item που δίνει extra ζωή, ή freeze-time για 3″.
- **Boss/rush round** στα τελευταία 10″ όπου πέφτουν πολλά items ταυτόχρονα για ένταση στο τέλος.
- **Δυσκολία βασισμένη σε score-multiplier** αντί μόνο σε ταχύτητα (π.χ. Hard mode δίνει
  περισσότερους πόντους ανά catch) — απάντηση στο ερώτημα που είχε μπει νωρίτερα στη συζήτηση.
- **Landscape/tablet layout** αν το analytics δείξει σημαντικό ποσοστό μη-κατακόρυφης χρήσης.

## Analytics / measurement

- Βασικό event tracking (π.χ. Cloudflare Web Analytics — privacy-friendly, χωρίς cookies) για:
  παιχνίδια που ξεκίνησαν, ολοκληρώθηκαν, μέσο σκορ, ποσοστό χρήσης του share button, ποσοστό ανά
  γλώσσα/δυσκολία. Χρήσιμο για να δείτε αν άξιζε το micro-campaign και τι να βελτιώσετε επόμενη
  φορά.

## Accessibility / πολιτισμικά σημεία

- **Reduced motion**: σεβασμός στο `prefers-reduced-motion` για να μειωθεί/απενεργοποιηθεί η
  κίνηση της ομπρέλας/combo animation σε όσους το έχουν ενεργό στο σύστημά τους.
- **Contrast check** σε μικρά κείμενα πάνω σε ανοιχτόχρωμο background (π.χ. bag labels) για να
  διασφαλιστεί ευαναγνωσιμότητα σε έντονο ηλιακό φως σε κινητή οθόνη (πολύ ρεαλιστικό σενάριο
  χρήσης, καλοκαίρι/παραλία!).
