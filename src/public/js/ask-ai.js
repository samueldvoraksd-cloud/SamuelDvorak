document.addEventListener('DOMContentLoaded', function () {
  var container = document.querySelector('.ask-ai-tile');
  if (!container) return;

  var status = container.querySelector('[data-ask-ai-status]');

  var providers = {
    chatgpt: {
      label: 'ChatGPT',
      buildUrl: function (prompt) {
        return 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
      },
    },
    claude: {
      label: 'Claude',
      buildUrl: function (prompt) {
        return 'https://claude.ai/new?q=' + encodeURIComponent(prompt);
      },
    },
    perplexity: {
      label: 'Perplexity',
      buildUrl: function (prompt) {
        return 'https://www.perplexity.ai/search?q=' + encodeURIComponent(prompt);
      },
    },
  };

  function buildPrompt() {
    var domain = window.location.hostname;
    return 'Tell me about Samuel Dvorak based on ' + domain + '. Summarize who he is, what he does, and how to get in touch.';
  }

  container.querySelectorAll('.ask-ai__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var provider = providers[btn.getAttribute('data-provider')];
      if (!provider) return;

      var prompt = buildPrompt();
      var url = provider.buildUrl(prompt);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).catch(function () {});
      }

      if (status) {
        status.textContent = 'Prompt copied. Opening ' + provider.label + ' in a new tab — paste if it doesn\'t appear automatically.';
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
});
