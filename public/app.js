const templateEditor = document.getElementById('templateEditor');
const previewFrame = document.getElementById('previewFrame');
const previewStatus = document.getElementById('previewStatus');
const saveTemplateButton = document.getElementById('saveTemplate');
const resetTemplateButton = document.getElementById('resetTemplate');
const sendForm = document.getElementById('sendForm');
const sendButton = document.getElementById('sendButton');
const recipientInput = document.getElementById('recipientInput');
const subjectInput = document.getElementById('subjectInput');
const useEditorCheckbox = document.getElementById('useEditorHtml');
const notification = document.getElementById('notification');

let lastSavedTemplate = '';
let previewTimer;

function showNotification(message, type = 'info') {
  notification.textContent = message;
  notification.classList.remove('error', 'show');
  if (type === 'error') {
    notification.classList.add('error');
  }
  requestAnimationFrame(() => {
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 4000);
  });
}

function setLoadingState(target, isLoading, loadingText = 'Working…') {
  if (!target) return;

  if (isLoading) {
    target.dataset.originalText = target.textContent;
    target.textContent = loadingText;
    target.disabled = true;
  } else {
    target.textContent = target.dataset.originalText ?? target.textContent;
    target.disabled = false;
  }
}

function updatePreview(html) {
  previewStatus.textContent = 'rendering…';
  clearTimeout(previewTimer);

  previewTimer = setTimeout(() => {
    previewFrame.srcdoc = html;
    previewStatus.textContent = 'updated';
  }, 200);
}

async function loadTemplate() {
  setLoadingState(resetTemplateButton, true, 'Loading…');
  try {
    const response = await fetch('/api/template');
    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error || 'Failed to load template');
    }
    const data = await response.json();
    lastSavedTemplate = data.html ?? '';
    templateEditor.value = lastSavedTemplate;
    updatePreview(lastSavedTemplate);
    previewStatus.textContent = 'ready';
  } catch (error) {
    showNotification(error.message || 'Unable to load template.', 'error');
  } finally {
    setLoadingState(resetTemplateButton, false);
  }
}

async function saveTemplate() {
  const html = templateEditor.value;
  setLoadingState(saveTemplateButton, true, 'Saving…');
  try {
    const response = await fetch('/api/template', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html }),
    });
    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error || 'Failed to save template');
    }
    lastSavedTemplate = html;
    showNotification('Template saved successfully.');
  } catch (error) {
    showNotification(error.message || 'Unable to save template.', 'error');
  } finally {
    setLoadingState(saveTemplateButton, false);
  }
}

async function sendEmail(event) {
  event.preventDefault();
  const to = recipientInput.value.trim();
  const subject = subjectInput.value.trim();
  const useEditorHtml = useEditorCheckbox.checked;
  const html = useEditorHtml ? templateEditor.value : undefined;

  if (!to) {
    showNotification('Please provide a recipient email address.', 'error');
    recipientInput.focus();
    return;
  }

  setLoadingState(sendButton, true, 'Sending…');

  try {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    showNotification(result.message || 'Email sent successfully.');
    sendForm.reset();
    useEditorCheckbox.checked = true;
  } catch (error) {
    showNotification(error.message || 'Unable to send email.', 'error');
  } finally {
    setLoadingState(sendButton, false);
  }
}

templateEditor.addEventListener('input', () => {
  const currentHtml = templateEditor.value;
  updatePreview(currentHtml);
  previewStatus.textContent = currentHtml === lastSavedTemplate ? 'saved' : 'unsaved';
});

saveTemplateButton.addEventListener('click', saveTemplate);
resetTemplateButton.addEventListener('click', loadTemplate);
sendForm.addEventListener('submit', sendEmail);

window.addEventListener('DOMContentLoaded', loadTemplate);
