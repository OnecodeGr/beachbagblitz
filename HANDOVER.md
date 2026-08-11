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
├── manifest.webmanifest     ← PWA manifest (installable app) — δες παρακάτω
├── sw.js                    ← minimal service worker, καθόλου caching (δες παρακάτω)
├── assets/
│   ├── music/
│   │   └── music_0.mp3
│   └── icons/                ← PWA icons (192/512/512-maskable/apple-touch-180), όλα PNG
├── worker/
│   └── index.js             ← Cloudflare Worker: σερβίρει static assets + το /api/* JSON API
├── wrangler.toml             ← config: worker name, KV binding, assets directory
└── .assetsignore             ← αρχεία που ΔΕΝ πρέπει να σερβιριστούν σαν static assets
                                 (worker/, wrangler.toml, *.md, .git/, .wrangler/, node_modules/)
```

### Installable ως app (PWA)

Το παιχνίδι μπορεί να εγκατασταθεί σε home screen (iOS/Android) ή σαν desktop app (Chrome/Edge
"Install app"):

- `manifest.webmanifest` — name, icons (192/512 + 512 maskable), `display:"standalone"`,
  `orientation:"portrait"`, `background_color`/`theme_color: #0d0716` (ίδιο με το `--bg` του
  παιχνιδιού), `start_url: "/?source=pwa"`.
- Icons φτιαγμένα με το ίδιο radial gradient background που χρησιμοποιεί ήδη το παιχνίδι, με 🏖️
  emoji — το maskable variant έχει επιπλέον padding (safe zone) ώστε να μην κοπεί όταν το OS
  εφαρμόσει το δικό του mask (κύκλος/squircle/κ.λπ.).
- `<link rel="apple-touch-icon">` + `apple-mobile-web-app-*` meta tags στο `<head>` για iOS Safari,
  το οποίο αγνοεί εν μέρει το web manifest και θέλει τα δικά του tags για "Add to Home Screen".
- `sw.js` — **εντελώς minimal**, χωρίς κανένα caching/fetch interception. Η μόνη του δουλειά είναι
  να *υπάρχει* — κάποιοι browsers ακόμα το χρησιμοποιούν σαν ένα από τα installability signals.
  Σκόπιμα δεν κάνει cache τίποτα: το παιχνίδι στηρίζεται σε πάντα-φρέσκα `/api/*` δεδομένα
  (leaderboard, daily challenge, stats) — αν το service worker έκανε cache αυτές τις απαντήσεις θα
  υπήρχε κίνδυνος να δείχνει μπαγιάτικο leaderboard/σκορ.
- Verified: manifest fetched+parsed σωστά από πραγματικό browser (Chromium via Playwright), service
  worker φτάνει σε `active` state, το παιχνίδι δουλεύει κανονικά μετά την εγκατάσταση όλων αυτών.

### Link preview / social card (Discord, X, Facebook, Google)

Όταν κάποιος μοιράζεται το `https://bbb.onecode.win/` σε Discord/X/Facebook/κ.λπ., το link πρέπει
να δείχνει σωστό preview card (τίτλος, περιγραφή, εικόνα) — όχι απλά ένα γυμνό link. Στο `<head>`
του `index.html` υπάρχουν πλέον:

- **Open Graph** (`og:*`) — το κύριο πρότυπο, το διαβάζουν Discord, Facebook, LinkedIn, Slack κ.λπ.
  `og:title`, `og:description`, `og:image` (+ `width`/`height`/`type`/`alt`), `og:url`,
  `og:site_name`, `og:type`, `og:locale` (`en_US` κύριο, `el_GR` alternate — το ίδιο το παιχνίδι
  είναι δίγλωσσο).
- **Twitter/X Card** (`twitter:*`) — `summary_large_image` (μεγάλη preview εικόνα, όχι μικρό
  thumbnail). Το X διαβάζει πρώτα αυτά, μετά πέφτει σε OG tags σαν fallback.
- **Standard SEO**: `<meta name="description">`, `<link rel="canonical">`.
- **JSON-LD structured data** (`application/ld+json`, `schema.org/WebApplication`) — βοηθάει τη
  Google να καταλάβει τι είναι η σελίδα (δωρεάν παιχνίδι, `GameApplication`, publisher onecode).

**`assets/og-image.jpg`** (1200×630, το standard OG aspect ratio) — φτιαγμένο με το ίδιο radial
gradient background + τη gradient τυπογραφία (pink→purple) που έχει ήδη το `<h1>` μέσα στο ίδιο το
παιχνίδι, με το 🏖️, το ONECODE badge, τη legend (💻🎧📱 ⛱️🦩⭐ 🕶️🩴💄), και το `bbb.onecode.win` στο
footer για brand recall. Εξάγεται σαν JPEG (~46KB, όχι PNG) — μικρότερο αρχείο, πιο γρήγορο unfurl
σε chat apps, χωρίς ορατή απώλεια ποιότητας σε αυτό το περιεχόμενο (gradient + κείμενο, όχι φωτο).

⚠️ **Σημαντικό**: τα `og:image`/`og:url`/`twitter:image`/κ.λπ. χρειάζονται **absolute URLs**
(hardcoded `https://bbb.onecode.win/...`, όχι σχετικά paths) — οι crawlers των πλατφορμών τα
διαβάζουν χωρίς να τρέχουν JS και χωρίς notion του "current page" origin. Αν αλλάξει ποτέ το domain
του campaign, αυτά τα tags (και το `manifest.webmanifest`'s `start_url`, και το `SITE_URL` constant
μέσα στο `index.html` script για τα share messages) πρέπει να ενημερωθούν χειροκίνητα, δεν
παίρνονται αυτόματα από `window.location`.

Verified: όλα τα tags + η εικόνα σερβίρονται σωστά μέσα από τον πραγματικό Worker (σωστό
`content-type`, σωστό μέγεθος), και validated ότι δεν έσπασε τίποτα στο ίδιο το παιχνίδι.
Discord/Facebook/X cache τα link previews τους — αν χρειαστεί να δεις αμέσως το ενημερωμένο
preview μετά από αλλαγή, οι πλατφόρμες έχουν δικά τους debugger/cache-refresh εργαλεία (π.χ.
Twitter Card Validator, Facebook Sharing Debugger) — δεν αρκεί απλά να ξαναμοιράσεις το ίδιο link.

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
- **🏠 Αρχική** στο end screen: γυρνάει στην αρχική οθόνη χωρίς να ξεκινήσει νέο παιχνίδι (σε
  αντίθεση με το "Παίξε ξανά" που ξεκινάει αμέσως) — κρατάει το όνομα παίκτη που έχει ήδη γραφτεί.

### Leaderboard / Daily Challenge

- **Όνομα παίκτη**: input στην αρχική οθόνη, αποθηκεύεται σε `localStorage` (`bbb_playerName`).
  Απορρίπτει links (regex για `http`, `www.`, `.tld`) — client-side *και* server-side validation.
  Αν μείνει κενό, χρησιμοποιείται αυτόματα ένα προτεινόμενο όνομα τύπου `Χρώμα`+`Ζωάκι`+αριθμός
  (π.χ. `CoralTurtle42`) που φαίνεται σαν placeholder στο input.
- **Persistent player id**: `crypto.randomUUID()` αποθηκευμένο σε `localStorage`
  (`bbb_playerId`) — ταυτοποιεί τον παίκτη στο leaderboard χωρίς λογαριασμό/login.
- **Leaderboard**: τρία tabs πλέον — "Σήμερα" (daily, μηδενίζεται κάθε μέρα), "Ελεύθερο" (μόνο
  ελεύθερο παιχνίδι), και "Όλων των εποχών" (alltime, μικτό — free + daily μαζί, όπως πάντα). Top
  10 σε KV, κρατάει το **καλύτερο σκορ ποτέ ανά παίκτη** (όχι το πιο πρόσφατο submission —
  `upsertPlayerScore` στο `worker/index.js` κάνει compare-and-keep-max, όχι blind overwrite).
  Δίπλα στο όνομα εμφανίζεται 🔥 badge με το streak του παίκτη (αν >1), καθαρά cosmetic.

  **Free Play board (`score:freeplay:{playerId}`)**: προστέθηκε αργότερα, **αμιγώς additive** —
  δεν άγγιξε καθόλου τα υπάρχοντα `score:alltime:` / `score:daily:{date}:` write paths (ίδιος
  κώδικας, ίδια keys, byte-for-byte identical). Κάθε submission ελεύθερου παιχνιδιού (`mode:'free'`)
  γράφει *επιπλέον* και σε αυτό το καινούργιο, μέχρι τότε ανύπαρκτο KV prefix — μηδενικό ρίσκο
  collision με οτιδήποτε ήδη υπάρχει. Verified με πραγματικό test: seed 3 "υπαρκτών" παικτών στο
  alltime + 1 στο daily πριν το deploy, μετά submit νέων free/daily scores μέσω του νέου κώδικα, και
  confirmed ότι τα αρχικά 4 entries έμειναν byte-for-byte ίδια (score/streak/ts unchanged) ενώ το
  νέο freeplay board δούλεψε σωστά μεμονωμένα. **Σημείωση**: το νέο board ξεκινάει άδειο/σχεδόν
  άδειο — δεν υπάρχει τρόπος να ανακτηθούν retroactively τα ιστορικά free-play scores που ήδη έχουν
  μπλεχτεί μέσα στο alltime board (δεν κρατούσε ποτέ tag για το ποιο mode τα δημιούργησε), γεμίζει
  μόνο από εδώ και πέρα.
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
- **Daily Twist**: μία μικρή, seeded-ανά-ημέρα gameplay παραλλαγή, **μόνο στο Daily Challenge**
  (η ελεύθερη λειτουργία δεν επηρεάζεται καθόλου — ξεχωριστό seed namespace `'bbb-twist-'+date`,
  ανεξάρτητο από το seed της σειράς αντικειμένων, οπότε παραμένει fair/ίδιο για όλους τους
  παίκτες την ίδια μέρα). `pickDailyTwist()` στο `index.html` διαλέγει ένα από 5:
  - **🌅 Χρυσή Ώρα** (buff) — διπλάσιοι πόντοι στα πρώτα 15″ (`timeLeft > 45`).
  - **🌫️ Ομίχλη** (debuff) — τα κανονικά αντικείμενα ξεθωριάζουν όσο πέφτουν (power-ups/paradox
    μένουν πάντα ευδιάκριτα).
  - **🔀 Ανακάτεμα Τσαντών** (debuff) — οι 3 τσάντες αλλάζουν σειρά στην οθόνη (seeded shuffle,
    ίδιο ανακάτεμα όλη μέρα) — τα labels παραμένουν σωστά, απλά όχι στη συνηθισμένη θέση.
  - **🍀 Γούρι** (νέο icon) — ένα επιπλέον emoji προστίθεται σήμερα σε μία τυχαία κατηγορία, από
    ένα reserve pool 3/κατηγορία (`LUCKY_CHARM_POOL`: ⌚🎮📷 tech, 🍉🥥🦀 beach, 👒💍🧴 style).
  - **🌀 Παράδοξο** (active mechanic) — σπάνιο ειδικό item (6% spawn chance) που μετράει **μόνο
    αν πέσει στη ΛΑΘΟΣ τσάντα** — αντιστρέφει τον βασικό κανόνα του παιχνιδιού για το ένα αυτό
    αντικείμενο, ζητάει ενεργή σκέψη αντί για αυτόματη κίνηση.

  Εμφανίζεται preview badge στο daily-status (πριν παίξεις, και στο end screen) — `pickDailyTwist()`
  είναι pure function της ημερομηνίας, οπότε το preview call δίνει ακριβώς το ίδιο twist με αυτό
  που θα ενεργοποιηθεί όταν πραγματικά ξεκινήσεις. Επίσης μικρό chip στο HUD κατά τη διάρκεια ενός
  daily run, για υπενθύμιση.
- **Countdown**: "Ξαναέλα σε Xh Ym" μετά την ολοκλήρωση και των 3 daily προσπαθειών, μέχρι το
  επόμενο τοπικό μεσονύχτι.

### Βασικό event tracking (analytics)

Το Cloudflare Web Analytics **δεν υποστηρίζει custom events** (επιβεβαιωμένο από τα docs — μόνο
pageviews/performance). Οπότε το βασικό event tracking που ζητήθηκε (παιχνίδια που ξεκίνησαν/
ολοκληρώθηκαν, μέσο σκορ, χρήση του share button, ανά γλώσσα/δυσκολία) υλοποιήθηκε σαν δικό μας,
cookieless endpoint πάνω στο ίδιο Worker/KV:

- `POST /api/event` με `{type: 'game_started'|'game_completed'|'share_used', lang, difficulty, mode, score}`
  — καλείται από το frontend μέσω `navigator.sendBeacon` (fire-and-forget, δεν μπλοκάρει το UI).
  Κάθε event γράφεται σε δικό του μοναδικό KV key (`event:{date}:{uuid}`, metadata-only, καθόλου
  τιμή) — μηδενικό read-modify-write, μηδενικό race μεταξύ ταυτόχρονων events.
- `GET /api/stats` — retrieval του tracking. Δες παρακάτω για τα modes.
- Προαιρετικά, υπάρχει commented-out το standard Cloudflare Web Analytics beacon script στο
  `<head>` του `index.html` για baseline pageview/performance metrics — χρειάζεται να φτιάξεις ένα
  site στο Cloudflare dashboard (Account Home → Web Analytics) και να βάλεις το token του.

#### Πώς να διαβάσεις τα stats

`GET /api/stats` δεν έχει UI/dashboard — είναι raw JSON, το χτυπάς απευθείας (browser ή `curl`).
Τρία modes:

- **Μία μέρα** (προεπιλογή = σήμερα): `GET /api/stats` ή `GET /api/stats?date=2026-08-07`
  → `{ date, stats }`.
- **Όλο το campaign**: `GET /api/stats?range=all` → `{ range: "all", stats: <grand total>, byDay: [{date, stats}, ...] }`.
  Λίστάρει ό,τι event υπάρχει ακόμα στο KV (events λήγουν μετά ~30 μέρες, δες `DAILY_TTL_SECONDS`)
  και τα ομαδοποιεί ανά ημέρα, χωρίς να χρειάζεται να ξέρεις εκ των προτέρων ποιες μέρες έχουν data.
- **Συγκεκριμένο εύρος**: `GET /api/stats?from=2026-08-05&to=2026-08-07` (και τα δύο προαιρετικά,
  ανοιχτό εύρος αν λείπει το ένα) → ίδιο σχήμα με `range=all`, φιλτραρισμένο.

Σε κάθε mode, το `stats` object έχει: `gamesStarted`, `gamesCompleted`, `totalScore`, `averageScore`
(ήδη υπολογισμένο, `totalScore ÷ gamesCompleted`), `shareUsed`, `dailyChallengePlays`, `byLang`,
`byDifficulty`. Κανένα PII, κανένα cookie, μόνο aggregate counters.

⚠️ Το endpoint είναι **public, χωρίς auth** — όποιος ξέρει το URL μπορεί να το διαβάσει. Αποδεκτό
ρίσκο για ένα casual 2-εβδομάδων microsite, αλλά αν θες να το κλειδώσεις (π.χ. shared-secret query
param ή header check στο Worker) είναι μικρή αλλαγή.

## Γνωστοί περιορισμοί / σημεία προσοχής

- Τα Google Fonts φορτώνονται μέσω `@import` — αν θες πλήρως offline-capable ή γρηγορότερο first
  paint, θα χρειαστεί να κατέβουν τοπικά τα font files και να αλλάξει το `@import` σε `@font-face`
  με τοπικά αρχεία μέσα στο `assets/`.
- Το mp3 δεν έχει compression/size guidance — καλό θα ήταν να μείνει κάτω από ~2-3MB για γρήγορο
  loop χωρίς καθυστέρηση σε mobile δεδομένα.
- Το παιχνίδι είναι σχεδιασμένο για κατακόρυφο (portrait) mobile — δεν έχει ειδικό χειρισμό για
  landscape ή tablet/desktop πέρα από το `max-width:520px` container.
- **[FIXED]** Οι οθόνες (`.overlay` — start/end/leaderboard) έγιναν scrollable ώστε να χωράνε σε
  κοντές οθόνες (δες commit "Fix start screen options being unreachable..."), αλλά το πρώτο fix
  χρησιμοποιούσε `justify-content:center` σε flex container με `overflow-y:auto`. Real-world
  σύμπτωμα σε κάποιες συσκευές (πιθανότατα WebKit/Safari, δεν αναπαράχθηκε σε Chromium): το
  αρχικό scroll position ξεκινούσε ήδη κεντραρισμένο (κρύβοντας τόσο την κορυφή ΟΣΟ και ενδεχομένως
  το κάτω μέρος του περιεχομένου) αντί να ξεκινάει από την πάνω-πάνω θέση — γνωστή cross-browser
  ασυνέπεια στο πώς χειρίζονται οι μηχανές browser το "which end gets clipped" όταν κεντραρισμένο
  περιεχόμενο υπερχειλίζει σε scroll container. **Fix**: αντικαταστάθηκε με το πιο robust πρότυπο
  `margin:auto 0` σε ένα `.overlay-inner` wrapper (κάθε `.overlay` πλέον περιέχει το πραγματικό του
  περιεχόμενο μέσα σε ένα `<div class="overlay-inner">`) — καθαρό box-model math (auto margin
  γίνεται 0 όταν δεν υπάρχει ελεύθερος χώρος), όχι alignment-algorithm-με-overflow-ambiguity σαν το
  `justify-content:center`, άρα δεν έχει το ίδιο πρόβλημα σε καμία μηχανή browser. Verified σε
  Chromium (δεν υπάρχει WebKit engine διαθέσιμο σε αυτό το sandbox για άμεσο test): scrollTop=0 στο
  load, πλήρες scroll range ακόμα προσβάσιμο, ίδιο ακριβώς οπτικό αποτέλεσμα όταν το περιεχόμενο
  χωράει χωρίς scroll.
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
