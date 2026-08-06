# Beach Bag Blitz — Handover

Παιχνίδι για κινητά, φτιαγμένο για τις καλοκαιρινές διακοπές του onecode (Αύγουστος).
Μηχανική: sort/match-3 style — ο παίκτης σέρνει αντικείμενα που πέφτουν στη σωστή τσάντα
(Tech / Beach / Style) πριν φτάσουν στην άμμο.

## Τι παραδίδεται

Το frontend είναι ένα **αυτόνομο αρχείο**: `index.html` — καθαρό HTML + CSS + vanilla JS,
χωρίς build step/bundler/dependencies. Ό,τι χρειάζεται είναι μέσα, εκτός από:

- ένα Google Font import μέσω `@import url(...)` στην κορυφή του `<style>` (Fredoka + Poppins) — χρειάζεται internet, δεν είναι bundled τοπικά.
- το μουσικό αρχείο background (βλ. παρακάτω).

Επιπλέον, από την προσθήκη του leaderboard και μετά, το project **δεν είναι πια 100% static**:
υπάρχει ένα μικρό **Cloudflare Worker** (`worker/index.js`) που σερβίρει το static site ΚΑΙ ένα
μικρό JSON API (`/api/score`, `/api/leaderboard`) πάνω σε **Cloudflare KV** για το leaderboard.
Δες την ενότητα "Leaderboard / Daily Challenge" παρακάτω.

## Δομή φακέλων

```
/ (root)
├── index.html              ← το ίδιο το παιχνίδι
├── assets/
│   └── music/
│       └── music_0.mp3
├── worker/
│   └── index.js             ← Cloudflare Worker: σερβίρει static assets + το /api/* JSON API
├── wrangler.toml             ← config: worker name, KV binding, assets directory
└── .assetsignore             ← αρχεία που ΔΕΝ πρέπει να σερβιριστούν σαν static assets
                                 (worker/, wrangler.toml, *.md, .git/, .wrangler/, node_modules/)
```

Το HTML αναφέρεται στο μουσικό αρχείο με **σχετικό path**:
```html
<audio id="bg-music" loop preload="auto">
  <source src="assets/music/music_0.mp3" type="audio/mpeg">
</audio>
```
Άρα αρκεί το mp3 να μείνει στο `assets/music/music_0.mp3` σε σχέση με το html.

### Σχετικά με το background μουσικό loop
- Παίζει σε loop (`loop` attribute) και ξεκινάει στο **πρώτο tap/click** του χρήστη οπουδήποτε
  στη σελίδα — αυτό είναι σκόπιμο: όλα τα mobile browsers (iOS Safari, Chrome Android) μπλοκάρουν
  autoplay με ήχο μέχρι να υπάρξει πραγματική χειρονομία χρήστη. Αν δεν παίξει αμέσως με το
  load, είναι αναμενόμενο· θα ξεκινήσει με το πρώτο touch.
- Υπάρχει ένα κουμπάκι mute/unmute (🔊/🔇) πάνω δεξιά, πάνω από τις τσάντες, ορατό σε όλες τις
  οθόνες (αρχική, παιχνίδι, τέλος).
- Ένταση προεπιλογής: 0.55 — άλλαξέ το στο `bgMusic.volume` αν χρειαστεί.

## Deploy σε Cloudflare Worker + Git

Στο Cloudflare account **ONECODE Support** έχουν ήδη δημιουργηθεί:
- Worker: **`beachbagblitz`**
- KV namespace: **`beach-bag-blitz-leaderboard`** (id `8b64091dc66d41c4bb2d8d9a795af625`), ήδη
  δεμένο στο `wrangler.toml` με binding `LEADERBOARD`.

Ό,τι λείπει είναι το **actual deploy** — δεν υπάρχει `wrangler` authentication μέσα σε αυτό το
sandbox, οπότε ο κώδικας είναι έτοιμος αλλά χρειάζεται να τρέξει το deploy από μηχάνημα/session με
πρόσβαση στον Cloudflare λογαριασμό:

1. `npx wrangler login` (μία φορά, ανοίγει browser για auth).
2. Μέσα στον φάκελο του project: `npx wrangler deploy` — διαβάζει το `wrangler.toml`, ανεβάζει το
   `worker/index.js` σαν Worker script, συνδέει το υπάρχον KV namespace, και ανεβάζει
   `index.html` + `assets/` σαν static assets.
3. Μόλις είναι live σε πραγματικό https domain (`*.workers.dev` ή custom domain), δοκίμασε:
   - Το κουμπί **Μοιράσου το** στο τέλος — παράγει branded εικόνα (canvas) με το score πάνω σε
     onecode branding και ανοίγει το native Web Share API (Instagram Stories κ.λπ.), το οποίο
     **απαιτεί HTTPS**. Fallback: download της εικόνας + copy κειμένου στο clipboard.
   - Τα endpoints `/api/leaderboard?scope=daily` και `/api/leaderboard?scope=alltime` πρέπει να
     επιστρέφουν `{"scope":...,"entries":[]}` αρχικά (κενό leaderboard).

### Τοπικό testing χωρίς login

`npx wrangler dev --local` σερβίρει το ίδιο Worker + KV locally χωρίς να χρειάζεται authentication
(Miniflare simulation). **Πρόσεχε**: βάλε `--persist-to` σε φάκελο **εκτός** του project root,
αλλιώς ο φάκελος `.wrangler/` που δημιουργεί το ίδιο το wrangler μπαίνει μέσα στο assets directory
(`./`) και προκαλεί ατέρμονο reload loop (το `.assetsignore`/`.gitignore` το αγνοούν πλέον, αλλά
το `--persist-to` είναι πιο καθαρή λύση για dev).

## Ρυθμίσεις που υπάρχουν ήδη μέσα στο παιχνίδι

- **Γλώσσα**: ΕΛ/EN toggle πάνω δεξιά στην αρχική οθόνη — αλλάζει οδηγίες, ετικέτες τσαντών,
  δυσκολία, μηνύματα τέλους, και όλα τα κείμενα leaderboard/daily challenge.
- **Δυσκολία**: Εύκολο / Κανονικό / Δύσκολο — επηρεάζει την ταχύτητα πτώσης, **και** το σκοράρισμα:
  το Δύσκολο δίνει **+30% πόντους ανά catch** (`DIFFICULTIES[d].scoreMult`). Στο Daily Challenge
  είναι πάντα κλειδωμένη στο "Κανονικό" (για δίκαιη σύγκριση) και επαναφέρεται στην προηγούμενη
  επιλογή μόλις τελειώσουν οι daily προσπάθειες.
- **Φύλο** (👙/🩳): επηρεάζει μόνο το κείμενο του "certified champion" μηνύματος στο τέλος.
- **Ήχοι εφέ / confetti / haptics**: ding στο σωστό catch, buzz στο miss (synthesized με Web Audio
  API, όχι αρχεία), confetti burst που κλιμακώνεται με το combo, `navigator.vibrate(10)`.
- **Power-ups**: σπάνια bonus items (8% ανά spawn, `POWERUP_CHANCE`), οπτικά ξεχωριστά (χρυσό
  glow, pulsing animation), πιάνονται σε **οποιαδήποτε** τσάντα (δεν ανήκουν σε κατηγορία):
  - 🛟 δίνει πίσω 1 ζωή (μέχρι το cap των 3) αν λείπει κάποια.
  - ❄️ παγώνει τα πάντα (falling items + το countdown) για 3 δευτερόλεπτα — δεν χάνεις ζωή αν ένα
    power-up φτάσει στην άμμο αχρησιμοποίητο, απλά χάνεται σιωπηλά.
- **Μοιράσου το σκορ**: branded εικόνα (canvas) πάνω σε onecode styling μέσω Web Share API
  (`files`), με fallback σε download εικόνας + copy κειμένου στο clipboard.

### Leaderboard / Daily Challenge

- **Όνομα παίκτη**: input στην αρχική οθόνη, αποθηκεύεται σε `localStorage` (`bbb_playerName`).
  Απορρίπτει links (regex για `http`, `www.`, `.tld`) — client-side *και* server-side validation.
  Αν μείνει κενό, χρησιμοποιείται αυτόματα ένα προτεινόμενο όνομα τύπου `Χρώμα`+`Ζωάκι`+αριθμός
  (π.χ. `CoralTurtle42`) που φαίνεται σαν placeholder στο input.
- **Persistent player id**: `crypto.randomUUID()` αποθηκευμένο σε `localStorage`
  (`bbb_playerId`) — ταυτοποιεί τον παίκτη στο leaderboard χωρίς λογαριασμό/login.
- **Leaderboard**: δύο tabs, "Σήμερα" (μηδενίζεται κάθε μέρα) και "Όλων των εποχών" — top 10 σε
  KV, κρατάει το **καλύτερο σκορ ποτέ ανά παίκτη** (όχι το πιο πρόσφατο submission — `upsertBoard`
  στο `worker/index.js` κάνει compare-and-keep-max, όχι blind overwrite). Κάθε κανονική
  προσπάθεια τροφοδοτεί το all-time board· μόνο το Daily Challenge τροφοδοτεί και το daily board.
  Δίπλα στο όνομα εμφανίζεται 🔥 badge με το streak του παίκτη (αν >1), καθαρά cosmetic.
- **Daily Challenge**: ξεχωριστό κουμπί, **best of 3 προσπάθειες/μέρα** — κρατάμε το καλύτερο σκορ
  των 3 (enforcement του attempt-count client-side μέσω `localStorage`, όχι server-side· ένας
  αποφασισμένος χρήστης θα μπορούσε να το παρακάμψει καθαρίζοντας localStorage — αποδεκτό ρίσκο
  για ένα casual καλοκαιρινό microsite, το server-side "keep max score" όμως ΔΕΝ παρακάμπτεται
  έτσι). Το κουμπί "Παίξε ξανά" στο end screen συνεχίζει αυτόματα την daily πρόκληση όσο απομένουν
  προσπάθειες· μόλις εξαντληθούν, πέφτει σε ελεύθερο παιχνίδι. Όλοι οι παίκτες παίζουν την **ίδια
  ακολουθία αντικειμένων/power-ups** μέσα στην ίδια ημέρα — seeded PRNG (mulberry32) με seed από
  την ημερομηνία (Europe/Athens, UTC+3 hardcoded — δες παρακάτω).
- **Streak**: μετράει συνεχόμενες ημέρες daily challenge σε `localStorage` — αυξάνεται μόνο στην
  **πρώτη** από τις 3 προσπάθειες κάθε μέρας, όχι σε κάθε προσπάθεια. Εμφανίζεται σαν 🔥 badge στο
  daily status, στο end screen, και στο leaderboard.
- **Countdown**: "Ξαναέλα σε Xh Ym" μετά την ολοκλήρωση και των 3 daily προσπαθειών, μέχρι το
  επόμενο τοπικό μεσονύχτι.

### Βασικό event tracking (analytics)

Το Cloudflare Web Analytics **δεν υποστηρίζει custom events** (επιβεβαιωμένο από τα docs — μόνο
pageviews/performance). Οπότε το βασικό event tracking που ζητήθηκε (παιχνίδια που ξεκίνησαν/
ολοκληρώθηκαν, μέσο σκορ, χρήση του share button, ανά γλώσσα/δυσκολία) υλοποιήθηκε σαν δικό μας,
cookieless endpoint πάνω στο ίδιο Worker/KV:

- `POST /api/event` με `{type: 'game_started'|'game_completed'|'share_used', lang, difficulty, mode, score}`
  — καλείται από το frontend μέσω `navigator.sendBeacon` (fire-and-forget, δεν μπλοκάρει το UI).
- `GET /api/stats?date=YYYY-MM-DD` (προεπιλογή: σήμερα) επιστρέφει τα aggregated ημερήσια counters:
  `gamesStarted`, `gamesCompleted`, `totalScore` (÷ `gamesCompleted` = μέσο σκορ), `shareUsed`,
  `dailyChallengePlays`, `byLang`, `byDifficulty`. Κανένα PII, κανένα cookie, μόνο aggregate
  counters ανά ημέρα σε KV (key: `stats:{date}`).
- Προαιρετικά, υπάρχει commented-out το standard Cloudflare Web Analytics beacon script στο
  `<head>` του `index.html` για baseline pageview/performance metrics — χρειάζεται να φτιάξεις ένα
  site στο Cloudflare dashboard (Account Home → Web Analytics) και να βάλεις το token του.

## Γνωστοί περιορισμοί / σημεία προσοχής

- Τα Google Fonts φορτώνονται μέσω `@import` — αν θες πλήρως offline-capable ή γρηγορότερο first
  paint, θα χρειαστεί να κατέβουν τοπικά τα font files και να αλλάξει το `@import` σε `@font-face`
  με τοπικά αρχεία μέσα στο `assets/`.
- Το mp3 δεν έχει compression/size guidance — καλό θα ήταν να μείνει κάτω από ~2-3MB για γρήγορο
  loop χωρίς καθυστέρηση σε mobile δεδομένα.
- Το παιχνίδι είναι σχεδιασμένο για κατακόρυφο (portrait) mobile — δεν έχει ειδικό χειρισμό για
  landscape ή tablet/desktop πέρα από το `max-width:520px` container.
- Η ζώνη ώρας του daily challenge/leaderboard είναι **hardcoded UTC+3** (Europe/Athens,
  καλοκαίρι) και στον Worker (`worker/index.js`) και στο frontend — σωστό για τη διάρκεια του
  campaign, αλλά θα χρειαστεί χειροκίνητη αλλαγή αν το campaign συνεχίσει μετά την αλλαγή ώρας.
- **[FIXED]** Το leaderboard αρχικά αποθήκευε κάθε board σαν ένα ενιαίο JSON blob σε ένα κοινό KV
  key (`daily:{date}`, `alltime`) — read-modify-write πάνω στο ίδιο key. Real-world συμπτωμα: μέρα
  με αρκετούς ταυτόχρονους παίκτες, το "Σήμερα" leaderboard έδειχνε μόνο 1 εγγραφή αντί για όλους
  όσους έπαιξαν (τα ταυτόχρονα submissions πάτησαν το ένα πάνω στο άλλο, το Cloudflare KV δεν έχει
  compare-and-swap). **Fix**: κάθε παίκτης γράφει πλέον σε δικό του, ξεχωριστό KV key
  (`score:daily:{date}:{playerId}`, `score:alltime:{playerId}`) με το score/name/streak σαν KV
  *metadata* — μηδενικό race μεταξύ διαφορετικών παικτών, αφού δεν μοιράζονται key. Το board
  υπολογίζεται on-the-fly στο GET μέσω `LEADERBOARD.list({prefix})` (με pagination αν χρειαστεί).
  Το ίδιο fix εφαρμόστηκε και στο `/api/event`/`/api/stats` (κάθε event γράφεται σε δικό του
  μοναδικό key, μηδέν read-modify-write). **Side effect του fix**: επειδή άλλαξε το KV key schema,
  τα παλιά keys (`daily:*`, `alltime`, `stats:*`) εγκαταλείπονται — το leaderboard "μηδενίζεται"
  μετά το επόμενο deploy (ό,τι είχε ήδη χαθεί λόγω του bug έτσι κι αλλιώς δεν ήταν αξιόπιστο).
- Score cap 5000 στο API (`MAX_SCORE`) σαν βασικός anti-spoofing έλεγχος — όχι πλήρες anti-cheat
  σύστημα, απλά μπλοκάρει προφανώς πλασματικά νούμερα.
