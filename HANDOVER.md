# Beach Bag Blitz — Handover

Παιχνίδι για κινητά, φτιαγμένο για τις καλοκαιρινές διακοπές του onecode (Αύγουστος).
Μηχανική: sort/match-3 style — ο παίκτης σέρνει αντικείμενα που πέφτουν στη σωστή τσάντα
(Tech / Beach / Style) πριν φτάσουν στην άμμο.

## Τι παραδίδεται

Ένα **αυτόνομο αρχείο**: `beach-bag-blitz.html`
Δεν έχει build step, δεν έχει dependencies, δεν χρειάζεται bundler. Καθαρό HTML + CSS + vanilla JS
σε ένα αρχείο. Ό,τι χρειάζεται είναι μέσα, εκτός από:

- ένα Google Font import μέσω `@import url(...)` στην κορυφή του `<style>` (Fredoka + Poppins) — χρειάζεται internet, δεν είναι bundled τοπικά.
- το μουσικό αρχείο background (βλ. παρακάτω).

## Δομή φακέλων που χρειάζεται στο git

```
/ (root)
├── index.html              ← μετονόμασε το beach-bag-blitz.html σε index.html
└── assets/
    └── music/
        └── music_0.mp3     ← το mp3 που θα ανεβάσεις εσύ
```

Το HTML αναφέρεται ήδη στο μουσικό αρχείο με **σχετικό path**:
```html
<audio id="bg-music" loop preload="auto">
  <source src="assets/music/music_0.mp3" type="audio/mpeg">
</audio>
```
Άρα αρκεί να μπει το mp3 ακριβώς στο `assets/music/music_0.mp3` σε σχέση με το html — δεν
χρειάζεται καμία αλλαγή στον κώδικα.

### Σχετικά με το background μουσικό loop
- Παίζει σε loop (`loop` attribute) και ξεκινάει στο **πρώτο tap/click** του χρήστη οπουδήποτε
  στη σελίδα — αυτό είναι σκόπιμο: όλα τα mobile browsers (iOS Safari, Chrome Android) μπλοκάρουν
  autoplay με ήχο μέχρι να υπάρξει πραγματική χειρονομία χρήστη. Αν δεν παίξει αμέσως με το
  load, είναι αναμενόμενο· θα ξεκινήσει με το πρώτο touch.
- Υπάρχει ένα κουμπάκι mute/unmute (🔊/🔇) πάνω δεξιά, πάνω από τις τσάντες, ορατό σε όλες τις
  οθόνες (αρχική, παιχνίδι, τέλος).
- Ένταση προεπιλογής: 0.55 — άλλαξέ το στο `bgMusic.volume` αν χρειαστεί.

## Deploy σε Cloudflare Worker + Git

Το παιχνίδι είναι 100% static (ένα html + ένα mp3), οπότε ταιριάζει με **Cloudflare Workers
Static Assets** (ή, εναλλακτικά, Cloudflare Pages — και τα δύο δουλεύουν, απλά ζήτησες Worker).

Βασικά βήματα (σε γενικές γραμμές — επιβεβαίωσε στο τρέχον Cloudflare docs γιατί το tooling
ενημερώνεται συχνά):

1. `git init` στον φάκελο, πρόσθεσε `index.html` και `assets/music/music_0.mp3`, commit, push σε
   ένα νέο repo.
2. Στο project φτιάξε ένα `wrangler.toml` που δείχνει το static assets directory στον φάκελο
   root (ή σε `public/` αν προτιμήσεις να μετακινήσεις τα αρχεία εκεί).
3. `wrangler deploy` (ή σύνδεση του repo απευθείας από το Cloudflare dashboard για auto-deploy σε
   κάθε push — αν θες CI/CD χωρίς να τρέχεις εσύ το deploy κάθε φορά).
4. Μόλις είναι live σε πραγματικό https domain (όχι `file://`), δοκίμασε το κουμπί **Share
   score** στο τέλος — χρησιμοποιεί το native Web Share API, το οποίο **απαιτεί HTTPS** για να
   δουλέψει. Σε localhost/https θα ανοίγει το native share sheet του κινητού· αν ανοιχτεί σαν
   τοπικό αρχείο θα πέσει στο clipboard-copy fallback (λειτουργεί ούτως ή άλλως, απλά είναι το
   δεύτερο-καλύτερο experience).

## Ρυθμίσεις που υπάρχουν ήδη μέσα στο παιχνίδι

- **Γλώσσα**: ΕΛ/EN toggle πάνω δεξιά στην αρχική οθόνη — αλλάζει οδηγίες, ετικέτες τσαντών,
  δυσκολία, μηνύματα τέλους.
- **Δυσκολία**: Εύκολο / Κανονικό / Δύσκολο — επηρεάζει μόνο την ταχύτητα πτώσης (και πόσο
  γρήγορα αυξάνεται μέσα στα 60 δευτερόλεπτα), όχι το σκοράρισμα.
- **Φύλο** (👙/🩳): επηρεάζει μόνο το κείμενο του "certified champion" μηνύματος στο τέλος
  (γραμματικό γένος στα Ελληνικά· στα Αγγλικά το κείμενο είναι ουδέτερο).
- **Μοιράσου το σκορ**: Web Share API με clipboard fallback (βλ. παραπάνω).
- Δεν χρησιμοποιείται `localStorage`/`sessionStorage` πουθενά — το high score δεν επιμένει
  μεταξύ sessions αυτή τη στιγμή (δες το `IMPROVEMENTS.md` για πρόταση σχετικά).

## Γνωστοί περιορισμοί / σημεία προσοχής

- Τα Google Fonts φορτώνονται μέσω `@import` — αν θες πλήρως offline-capable ή γρηγορότερο first
  paint, θα χρειαστεί να κατέβουν τοπικά τα font files και να αλλάξει το `@import` σε `@font-face`
  με τοπικά αρχεία μέσα στο `assets/`.
- Το mp3 δεν έχει compression/size guidance — καλό θα ήταν να μείνει κάτω από ~2-3MB για γρήγορο
  loop χωρίς καθυστέρηση σε mobile δεδομένα.
- Το παιχνίδι είναι σχεδιασμένο για κατακόρυφο (portrait) mobile — δεν έχει ειδικό χειρισμό για
  landscape ή tablet/desktop πέρα από το `max-width:520px` container.
