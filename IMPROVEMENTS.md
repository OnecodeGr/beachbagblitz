# Beach Bag Blitz — Προτάσεις βελτίωσης

Ιδέες για επόμενες επαναλήψεις, ταξινομημένες χονδρικά από πιο απλές/φθηνές σε πιο μεγάλες αλλαγές.
Καμία δεν είναι απαραίτητη για το launch — το παιχνίδι είναι playable και ολοκληρωμένο όπως είναι.

## Γρήγορες, χαμηλού κόστους

- **Ήχοι εφέ**: ένα σύντομο "ding" σε κάθε σωστό catch, "buzz" σε λάθος/miss. Μικρά αρχεία (<50KB
  το καθένα), μεγάλη αίσθηση feedback χωρίς κόστος στο μέγεθος του build.
- **Confetti/particle burst** στο σωστό catch, ειδικά σε high combo (x3/x4) — κάνει το streak να
  αισθάνεται πιο γιορτινό. Μπορεί να γίνει με απλό CSS/JS particle χωρίς νέα βιβλιοθήκη.
- **Haptic feedback** σε mobile (`navigator.vibrate(10)`) σε κάθε σωστό/λάθος catch — πολύ φθηνό,
  αισθητά πιο "premium" feel σε κινητό.
- **Preload του ήχου/γραμματοσειρών** με `<link rel="preload">` ώστε να μην υπάρχει καθυστέρηση
  στο πρώτο play button.
- **Ένα δεύτερο item ανά κατηγορία** (π.χ. 🧴 αντηλιακό στο Beach, ⌚ smartwatch στο Tech) για λίγο
  περισσότερη ποικιλία οπτικά, χωρίς αλλαγή μηχανικής.

## Engagement / retention

- **Persisted high score**: αποθήκευση local best score (π.χ. μέσω Cloudflare KV αν θες
  server-side, ή localStorage αν αρκεί client-side) ώστε ο παίκτης να βλέπει "Best: 340" και να
  προσπαθεί να το ξεπεράσει — αυτή τη στιγμή το best μηδενίζεται σε κάθε reload.
- **Leaderboard**: αν θες κάτι πιο social, ένα απλό leaderboard (π.χ. μέσω Cloudflare
  Workers KV ή D1) με top 10 σκορ — ταιριάζει καλά με ένα καλοκαιρινό microsite campaign.
- **Daily/streak angle**: "Έλα ξανά αύριο" μήνυμα ή μικρό daily challenge (ίδιο seed αντικειμένων
  όλη μέρα) για λόγους επαναφοράς επισκεπτών μέσα στις 2 εβδομάδες του campaign.
- **Δυναμικό μήνυμα μοιράσματος με screenshot**: αντί μόνο για κείμενο, δημιουργία εικόνας
  (canvas) με το σκορ πάνω σε onecode branding, για πιο εντυπωσιακό share σε Instagram Stories
  κ.λπ. (το native Web Share API υποστηρίζει και αρχεία, όχι μόνο κείμενο).

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
