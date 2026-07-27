# Travel Mind — Netlify Version

This version is ready for Netlify.

## How it works

1. The visitor completes the form in `index.html`.
2. `script.js` sends the form data to `/api/plan`.
3. Netlify runs `netlify/functions/plan.mjs`.
4. The function securely calls OpenAI.
5. The itinerary is returned and displayed on the page.
6. A **Download PDF** button appears with the answer.
7. The downloaded PDF includes a branded header, trip-summary cards,
   styled itinerary sections, automatic page breaks and page numbers.
8. Markdown characters such as `#` and `*` are removed from the PDF. Day
   sections, time-of-day plans, recommendations and numbered tips each receive
   their own visual treatment.
9. The premium PDF version adds a full-page illustrated cover, a separate trip
   summary page, a fresh page for every day, bold activity titles, colour-coded
   hotel/food/transport/packing/budget sections and illustrated page headers.

Your OpenAI key is not stored in the HTML or JavaScript seen by visitors.

## Important: do not double-click index.html

Opening `index.html` as a normal file can display the design, but it cannot run
the Netlify function. The AI button works when either:

- the complete project is deployed on Netlify, or
- the project is running locally with `netlify dev`.

The page sends the trip details to `/api/plan`. Netlify receives that request,
calls OpenAI and sends the itinerary back. JavaScript then displays the answer
and prepares the PDF button.

## Easiest reliable deployment

### 1. Extract the ZIP

Extract the complete project. Do not upload only `index.html`.

### 2. Upload the project to GitHub

Create a GitHub repository and upload every file and folder, including:

```text
netlify/functions/plan.mjs
netlify.toml
```

### 3. Import it into Netlify

1. Sign in to Netlify.
2. Choose **Add new project**.
3. Choose **Import an existing project**.
4. Select GitHub and choose the repository.
5. Leave the build command empty.
6. Set the publish directory to `.`.
7. Deploy.

### 4. Add the OpenAI API key

In Netlify, open:

```text
Project configuration
→ Environment variables
→ Add a variable
```

Add:

```text
Key: OPENAI_API_KEY
Value: your real OpenAI API key
```

Save it and redeploy the site.

Do not place the API key in `script.js`, `index.html`, GitHub, or
`netlify.toml`.

## Test locally with Netlify CLI

Install the CLI once:

```bash
npm install -g netlify-cli
```

Create a local `.env` file:

```env
OPENAI_API_KEY=your_real_openai_api_key
```

Run:

```bash
netlify dev
```

Open the address shown in the terminal.

When you click **Create my itinerary**:

1. The button displays a loading message.
2. OpenAI creates the itinerary.
3. The itinerary becomes visible below the form.
4. The **Download PDF** button becomes visible at the same time.

## Main files

- `index.html` — the page and form
- `style.css` — the design
- `script.js` — form controls and result display
- `netlify/functions/plan.mjs` — secure OpenAI API call
- `netlify.toml` — Netlify configuration
