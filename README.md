# MailTo

MailTo is a lightweight web application that lets you edit an HTML email template in your browser, preview the rendered result instantly, and send it to any recipient via SMTP. The template is stored on disk so you can revisit and tweak it whenever you like.

## Features

- Web-based editor with syntax-friendly textarea and live preview
- Persist the HTML template to disk (`data/template.html`)
- Send the stored template or the current editor contents to any email address
- Configurable SMTP credentials via environment variables

## Getting Started

### Prerequisites

- Node.js 18+
- Access to an SMTP server (your email provider or a service like SendGrid, Mailgun, etc.)

### Installation

```bash
git clone https://github.com/Akhil-UI/mailto.git
cd mailto
npm install
cp .env.example .env
```

1. Edit `.env` with your SMTP credentials. At minimum, set `SMTP_HOST`, `SMTP_PORT`, and either `MAIL_FROM` or `SMTP_USER`.
2. Update `data/template.html` if you want to start from a different default template (you can also edit it from the UI later).

### Running the App

```bash
npm run dev   # reloads automatically on changes
# or
npm start     # runs with plain node
```

Then open <http://localhost:3000> in your browser.

## Environment Variables

| Variable      | Description                                                     | Default  |
| ------------- | --------------------------------------------------------------- | -------- |
| `PORT`        | Port for the Express server                                     | `3000`   |
| `SMTP_HOST`   | SMTP host                                                       | —        |
| `SMTP_PORT`   | SMTP port                                                       | —        |
| `SMTP_SECURE` | Set to `true` when the SMTP port expects TLS (e.g. port 465)    | `false`  |
| `SMTP_USER`   | SMTP username (omit for servers that do not require auth)       | —        |
| `SMTP_PASS`   | SMTP password                                                   | —        |
| `MAIL_FROM`   | Friendly from address used when sending emails (`Name <mail>`) | `SMTP_USER` |

## API Endpoints

The frontend uses these JSON endpoints; you can also call them directly.

| Method | Path            | Description                               |
| ------ | --------------- | ----------------------------------------- |
| GET    | `/api/template` | Returns the currently stored HTML template |
| PUT    | `/api/template` | Replaces the stored template (`{ html }`) |
| POST   | `/api/send`     | Sends an email (`{ to, subject?, html? }`) |

- If `html` is omitted in the send request, the stored template is sent.
- `subject` falls back to `MailTo HTML Email` when not provided.

## Development Notes

- Templates are saved in `data/template.html`. The server ensures the file exists on startup.
- Static assets live in `public/`. `public/app.js` handles loading the template, saving it, and making the send requests.
- The server is defined in `src/server.js`. It uses Express and Nodemailer.

## Contributing

Issues and pull requests are welcome! Please run the app and confirm that sending works against a test SMTP inbox before submitting changes that touch email delivery.
