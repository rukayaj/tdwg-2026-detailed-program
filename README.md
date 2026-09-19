# TDWG 2026 detailed program

An unofficial, independent, static presentation of the TDWG 2026 conference
schedule and talk abstracts.

The site has no runtime dependencies or build step. `index.html` loads the CSS,
JavaScript, and program data from `assets/`. GitHub Actions deploys the repository
to GitHub Pages after every push to `main`.

## Local preview

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Updating the program

The generated `assets/program-data.js` file comes from the companion local
`tdwg-2026-program` project. The public site deliberately labels itself as
unofficial and links visitors to TDWG and Whova for last-minute changes.
