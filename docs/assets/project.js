const items = [...document.querySelectorAll('[data-en]')];
for (const item of items) item.dataset.zh = item.innerHTML;
const toggle = document.getElementById('language');
let lang = 'zh';
toggle.addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  for (const item of items) item.innerHTML = item.dataset[lang];
  toggle.textContent = lang === 'en' ? '中文' : 'EN';
  toggle.setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
  document.getElementById('status').textContent = '';
});
document.getElementById('copy').addEventListener('click', async () => {
  const status = document.getElementById('status');
  try {
    await navigator.clipboard.writeText(document.getElementById('commands').textContent);
    status.textContent = lang === 'en' ? 'Commands copied.' : '命令已复制。';
  } catch {
    status.textContent = lang === 'en' ? 'Select and copy the commands above.' : '请选中上方命令并手动复制。';
  }
});
