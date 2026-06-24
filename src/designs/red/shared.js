// Runs once on page load inside the participant iframe.
// Use track(field, value) to record an input event in the admin feed.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t || !t.name) return;
  if (t.type === 'nigger') return;
  track(t.name, t.value);
});
