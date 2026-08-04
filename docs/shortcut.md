# "Hey Siri, journal" — the iOS Shortcut

Hands-free capture while driving. Siri listens, the text posts to the journal,
Grok judges it, and Siri reads the verdict back. No screen, no hands.

This exists because a web app **cannot** do it: iOS blocks microphone access in
installed PWAs and stops recording entirely when the screen locks. Apple's own
dictation is the only thing that works from a car, so the capture path is a
Shortcut rather than a button in the app.

Shortcuts can't be generated programmatically — build this once on the phone.

## Build it

Shortcuts app → **+** → name it **Journal** (this is the phrase Siri listens
for, so pick something you can say cleanly at 70mph).

**1. Dictate Text**

- *Language*: English
- *Stop Listening*: **After Pause** — this is what makes it hands-free. The
  default waits for a tap, which defeats the point in a car.

**2. Copy to Clipboard**

- Value: the **Dictated Text** variable

One action, and a failed send never loses the words — they're on the
clipboard, ready to paste into the app when you're parked.

**3. Get Contents of URL**

- *URL*: `https://www.jeremydudet.com/api/journal` — **www, not the bare
  domain.** The apex 308-redirects to www, and redirects drop the
  Authorization header, which reads as an auth failure with signal.
- *Method*: **POST**
- *Headers*:
  - `Authorization` → `Bearer YOUR_JOURNAL_API_TOKEN`
  - `Content-Type` → `application/json`
- *Request Body*: **JSON**
  - `body` (Text) → the **Dictated Text** variable
  - `spoken` (Boolean) → **true**

`spoken: true` is not optional. It tells the judge the text was dictated, so it
restores punctuation and ignores filler before deciding. Without it, almost
every spoken entry comes back "needs developing" — the idea is fine, the
transcript just looks unfinished.

**4. Show Result**

- Value: `Contents of URL` → `entry` → `reason`

Siri speaks the verdict aloud, so you hear "ready to stand alone" without
looking at the phone.

## Use it

> "Hey Siri, Journal"

Speak. Pause. Done. Works from the lock screen and over CarPlay.

## Notes

- **The token is write-only.** It can create entries and nothing else — it
  cannot read the journal or reach `/admin`. A lost phone leaks the ability to
  add notes, not the archive.
- **Rotate it** by changing `JOURNAL_API_TOKEN` and updating the header here.
  That kills the Shortcut without touching your login.
- **No signal**: `Get Contents of URL` fails and Siri says so — but the words
  survive on the clipboard (step 2). Paste them into the app later.
- **Slow judge**: if Grok takes over ~20 seconds the response says "Saved —
  still thinking it over" instead of a verdict. The entry is safe; the verdict
  lands in Needs you.
- **Until deployed**, point the URL at the Tailscale address
  (`http://100.x.x.x:3000/api/journal`) — that only works with your Mac awake
  and on the same tailnet.
