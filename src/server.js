const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.resolve(__dirname, '../data');
const TEMPLATE_PATH = path.resolve(DATA_DIR, 'template.html');

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to MailTo</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        background-color: #f6f9fc;
        margin: 0;
        padding: 24px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
      }
      header {
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: #ffffff;
        padding: 24px;
        text-align: center;
      }
      header h1 {
        margin: 0;
        font-size: 24px;
      }
      main {
        padding: 24px;
        color: #1f2937;
        line-height: 1.6;
      }
      .cta {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 24px;
        background-color: #2563eb;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
      }
      footer {
        background-color: #f1f5f9;
        padding: 16px 24px;
        text-align: center;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>Welcome to MailTo</h1>
        <p>Kickstart your next email campaign</p>
      </header>
      <main>
        <p>Hi there,</p>
        <p>
          Thanks for trying out the MailTo HTML email editor. You can customize this template
          to match your brand and messaging, then send it out with a single click.
        </p>
        <p>
          This template is fully responsive and follows best practices for HTML email clients.
        </p>
        <a class="cta" href="https://example.com">Explore MailTo</a>
        <p>Cheers,<br />The MailTo Team</p>
      </main>
      <footer>
        You're receiving this email because you signed up for MailTo updates.
      </footer>
    </div>
  </body>
</html>
`;

/**
 * Ensures that the data directory and template file exist.
 */
async function ensureTemplateFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(TEMPLATE_PATH);
  } catch {
    await fs.writeFile(TEMPLATE_PATH, DEFAULT_TEMPLATE, 'utf8');
  }
}

/**
 * Reads the currently stored HTML template from disk.
 * @returns {Promise<string>}
 */
async function readTemplate() {
  try {
    const file = await fs.readFile(TEMPLATE_PATH, 'utf8');
    return file;
  } catch (error) {
    await ensureTemplateFile();
    return DEFAULT_TEMPLATE;
  }
}

/**
 * Writes a new HTML template to disk.
 * @param {string} html
 */
async function writeTemplate(html) {
  await fs.writeFile(TEMPLATE_PATH, html, 'utf8');
}

let transporter;

/**
 * Lazily instantiate a Nodemailer transporter.
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT) {
    throw new Error('SMTP_HOST and SMTP_PORT must be set in the environment.');
  }

  const secure = SMTP_SECURE ? SMTP_SECURE === 'true' : Number(SMTP_PORT) === 465;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure,
    auth: SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
  });

  return transporter;
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '../public'), { extensions: ['html'] }));

app.get('/api/template', async (req, res) => {
  try {
    const html = await readTemplate();
    res.json({ html });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read template', details: error.message });
  }
});

app.put('/api/template', async (req, res) => {
  const { html } = req.body || {};

  if (typeof html !== 'string' || html.trim().length === 0) {
    return res.status(400).json({ error: 'Template HTML must be a non-empty string.' });
  }

  try {
    await writeTemplate(html);
    res.json({ message: 'Template updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
});

app.post('/api/send', async (req, res) => {
  const { to, subject, html } = req.body || {};

  if (typeof to !== 'string' || to.trim().length === 0) {
    return res.status(400).json({ error: 'Recipient email (to) is required.' });
  }

  const emailSubject = typeof subject === 'string' && subject.trim().length > 0
    ? subject.trim()
    : 'MailTo HTML Email';

  let content = html;
  if (typeof content !== 'string' || content.trim().length === 0) {
    try {
      content = await readTemplate();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load template for sending.', details: error.message });
    }
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  if (!from) {
    return res.status(500).json({ error: 'MAIL_FROM or SMTP_USER must be set to send email.' });
  }

  try {
    const mailTransporter = getTransporter();
    await mailTransporter.sendMail({
      from,
      to,
      subject: emailSubject,
      html: content,
    });

    res.json({ message: `Email sent to ${to}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

async function start() {
  try {
    await ensureTemplateFile();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();

module.exports = app;
