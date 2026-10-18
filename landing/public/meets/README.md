# Intellectual Meet photos

The "Intellectual Meet" slideshow on the landing page shows the photos listed in `meets.json`.
While the list is empty, the whole section stays hidden.

To add photos:

1. Put the image files in this folder. Use JPG, about 1600 px wide and under 300 KB each.
2. List them in `meets.json`, one entry per photo, in the order they should appear:

```json
[
  { "src": "2025-07-financial-management.jpg", "caption": "Financial management session", "year": "2025", "alt": "Speaker presenting to seated scholars" }
]
```

`alt` is a short description for screen readers (optional; the caption is used if it is missing).

Before adding a photo, make sure the people in it have agreed to appear on the public website,
and take extra care with students under 18. Prefer venue, speaker and group shots.
