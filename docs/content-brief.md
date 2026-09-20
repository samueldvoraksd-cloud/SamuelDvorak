# Content brief (from interview, 2026-09-19)

Feeds `src/content/site.json` and the first article per the design spec's
open items.

## Site identity
- Site title (nav / browser tab): **Samuel Dvorak**
- Tagline (home page, under name): **Mechanic-turned-pilot, now teaching others to fly**

## Newsletter box
- Name: **Beyond The Pattern**
- Description: Weekly aviation articles

## Contact
- Email: samueldvoraksd@gmail.com
- Presentation: "Email me" button/link, mailto:, lightly obfuscated (assembled
  client-side, not present as a raw address in static HTML/visible text) —
  not bulletproof against scrapers, but avoids trivial harvesting
- No other social links for v1

## Articles
- Ships with exactly one article at launch: the mechanic-to-pilot story
  (full text below). Article list/detail structure otherwise supports
  future posts with no further content needed yet.
- Suggested slug: `mechanic-to-pilot`
- Title: not yet chosen — pick something in that vein at implementation
  time (e.g. "The Mechanic Who Became a Pilot") unless Samuel specifies one.

## Bio copy — FINAL, approved 2026-09-19

### Full version — first article body (Markdown, becomes `mechanic-to-pilot.md`)

I started at a Part 147 aviation maintenance school, learning to maintain, repair, and inspect aircraft. Growing up, planes never interested me. I liked figuring things out, and I spent hours under the hood of an old Honda Civic, but cars never grabbed me either. Then I found out airplane mechanic school existed, and working on planes sounded a lot cooler than working on cars. That decision pulled me into aviation for good.

I graduated with my Airframe and Powerplant certifications and took a job at a flight school, wrenching on old trainer aircraft. One day, after I finished maintenance on a Diamond DA-42, my boss, who was also a pilot, took me along on the test flight. On that flight, I stopped wanting to fix airplanes and started wanting to fly them.

I moved from Georgia to Texas for a fully sponsored mechanic-to-pilot internship, trading flight school maintenance work for my private, instrument, and commercial ratings. I didn't know a single person in Texas when I packed my truck and left, but the deal was too good to pass up: fix airplanes by day, fly them the rest of the time, and walk away with a commercial certificate without paying for it out of pocket. After earning my commercial, I took a job with a regional airline under contract to United, doing line maintenance at Bush Intercontinental and learning how complex, multi-crew aircraft work under the skin. I kept adding ratings in my off time: commercial multi-engine, flight instructor, instrument flight instructor, and multi-engine flight instructor. Every rating I earned put me one step closer to the airlines, the goal I'd had since that DA-42 flight.

Then I got the job I'd been chasing since that DA-42 flight: teaching, at Brazos Valley Flight Services, where I still work today. I teach private, instrument, and commercial students now, and I want each of them to fall for flying the way I did on that test flight.

### Condensed version — About page bio (in `site.json`)

I didn't grow up dreaming about airplanes. I grew up taking things apart to see how they worked, mostly car engines on an old Honda Civic I never loved. When I found out airplane mechanic school existed, I figured wrenching on planes had to beat wrenching on cars. I was right, and it pulled me into aviation for good.

I earned my Airframe and Powerplant certifications and started fixing trainer aircraft at a flight school. Then, after a maintenance job on a Diamond DA-42, my boss, also a pilot, took me along on the test flight. On that flight, I stopped wanting to fix airplanes and started wanting to fly them.

I moved from Georgia to Texas for a mechanic-to-pilot internship, earned my ratings up through flight instructor, instrument flight instructor, and multi-engine flight instructor, and did line maintenance for a regional carrier at Bush Intercontinental along the way. Today I teach private, instrument, and commercial students at Brazos Valley Flight Services, and I want each of them to fall for flying the way I did that day in the DA-42.

## Still open (not blocking build)
- ConvertKit Form ID + API key
- Article title (placeholder above; confirm or replace)
