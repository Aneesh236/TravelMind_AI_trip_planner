# Travel Mind — Netlify Version

This version is ready for Netlify.

## How it works

1. The visitor completes the form in `index.html`.
2. `script.js` sends the form data to `/api/plan`.
3. Netlify runs `netlify/functions/plan.mjs`.
4. The function securely calls OpenAI.
5. The itinerary is returned and displayed on the page.

Your OpenAI key is not stored in the HTML or JavaScript seen by visitors.

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

## Main files

- `index.html` — the page and form
- `style.css` — the design
- `script.js` — form controls and result display
- `netlify/functions/plan.mjs` — secure OpenAI API call
- `netlify.toml` — Netlify configuration
