document.addEventListener('DOMContentLoaded', function () {
  function createButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-code-btn';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.innerText = 'Copy';
    return btn;
  }

  function flashButton(btn, text) {
    var original = btn.innerText;
    btn.innerText = text;
    btn.classList.add('copied');
    setTimeout(function () {
      btn.innerText = original;
      btn.classList.remove('copied');
    }, 2000);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject();
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  var blocks = document.querySelectorAll('pre');
  blocks.forEach(function (pre) {
    // Avoid double-adding
    if (pre.querySelector('.copy-code-btn')) return;

    // only if pre contains a code element (typical)
    var code = pre.querySelector('code');
    if (!code) return;

    // make sure pre is positioned
    if (getComputedStyle(pre).position === 'static') {
      pre.style.position = 'relative';
    }

    var btn = createButton();
    btn.addEventListener('click', function () {
      // Use textContent to avoid copying HTML
      var text = code.innerText || code.textContent;
      copyText(text).then(function () {
        flashButton(btn, 'Copied!');
      }).catch(function () {
        flashButton(btn, 'Error');
      });
    });

    // keyboard accessibility
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });

    pre.appendChild(btn);
  });
});
