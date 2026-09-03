// Runs before paint.

// 1. Clickjacking guard for hosts that can't send X-Frame-Options (GitHub Pages):
//    if this page is loaded inside a frame, break out of it.
try {
  if (window.self !== window.top) {
    window.top.location = window.self.location.href
  }
} catch (e) {
  document.documentElement.style.display = 'none'
}

// 2. Theme: light by default; dark only if the visitor chose it before.
try {
  if (localStorage.getItem('iscep-theme') === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch (e) {}
