/**
 * Obsidian Terminal - Portfolio Application Logic
 * Vanilla JavaScript (Zero External Dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Smooth Scroll with Sticky Header Offset
  const navLinks = document.querySelectorAll('a[href^="#"]');
  const header = document.getElementById('top-navbar');

  navLinks.forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 16;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 2. Active Navigation Item Highlight via IntersectionObserver
  const sections = document.querySelectorAll('section[id]');
  const desktopNavLinks = document.querySelectorAll('.nav-link');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          desktopNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
  }

  // 3. Email Copy to Clipboard with Accessible Feedback
  const copyBtn = document.getElementById('copyEmailBtn');
  const copyLabel = document.getElementById('copyLabel');
  const copyIcon = document.getElementById('copyIcon');
  const contactEmail = document.getElementById('contactEmail');

  if (copyBtn && contactEmail) {
    let revertTimeout = null;

    copyBtn.addEventListener('click', async () => {
      const emailToCopy = contactEmail.textContent.trim();

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(emailToCopy);
        } else {
          // Fallback for non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = emailToCopy;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        // Success state
        copyBtn.classList.add('copied');
        if (copyLabel) copyLabel.textContent = 'Copied!';
        if (copyIcon) copyIcon.textContent = 'done';
        copyBtn.setAttribute('aria-label', 'Email address copied to clipboard');

        if (revertTimeout) clearTimeout(revertTimeout);
        revertTimeout = setTimeout(() => {
          copyBtn.classList.remove('copied');
          if (copyLabel) copyLabel.textContent = 'Copy Email';
          if (copyIcon) copyIcon.textContent = 'content_copy';
          copyBtn.setAttribute('aria-label', 'Copy email address to clipboard');
        }, 2200);

      } catch (err) {
        console.error('Failed to copy email to clipboard:', err);
        if (copyLabel) copyLabel.textContent = 'Error';
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copy Email';
        }, 2000);
      }
    });
  }

  // 4. Live GitHub Contributions & Repository Telemetry
  // EDITABLE: GitHub username for live telemetry
  const GITHUB_USERNAME = 'YajiHub';

  async function loadLiveGitHubData(username) {
    const commitPill = document.getElementById('githubCommitCount');
    const repoSpan = document.getElementById('githubRepoCount');
    const heatmapGrid = document.getElementById('githubHeatmapGrid');

    // Fetch repository count from official GitHub API
    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        if (repoSpan && typeof userData.public_repos === 'number') {
          repoSpan.textContent = `${userData.public_repos} Repositories`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch GitHub user repo stats:', e);
    }

    // Fetch real-time contribution matrix from public contributions API
    try {
      const contribRes = await fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`);
      if (!contribRes.ok) return;

      const data = await contribRes.json();
      if (!data || !data.contributions || !Array.isArray(data.contributions)) return;

      // Update commit count badge dynamically
      if (commitPill && data.total && typeof data.total.lastYear === 'number') {
        commitPill.textContent = `${data.total.lastYear} contributions`;
      }

      // Group contributions into the 12 monthly columns (4 representative weeks per month)
      const contributions = data.contributions;
      if (contributions.length > 0 && heatmapGrid) {
        const monthlyBuckets = {};
        contributions.forEach(item => {
          const monthKey = item.date.slice(0, 7); // YYYY-MM
          if (!monthlyBuckets[monthKey]) {
            monthlyBuckets[monthKey] = [];
          }
          monthlyBuckets[monthKey].push(item);
        });

        const monthKeys = Object.keys(monthlyBuckets).slice(-12);
        let newGridHTML = '';

        monthKeys.forEach(mKey => {
          const days = monthlyBuckets[mKey];
          const chunkSize = Math.max(1, Math.floor(days.length / 4));
          newGridHTML += '<div class="heatmap-column">';

          for (let row = 0; row < 4; row++) {
            const start = row * chunkSize;
            const end = (row === 3) ? days.length : (row + 1) * chunkSize;
            const chunk = days.slice(start, end);

            let maxLevel = 0;
            let totalWeekCount = 0;
            chunk.forEach(d => {
              if (d.level > maxLevel) maxLevel = d.level;
              totalWeekCount += d.count || 0;
            });

            const dateRange = chunk.length > 0 ? `${chunk[0].date} to ${chunk[chunk.length - 1].date}` : mKey;
            const tooltip = `${totalWeekCount} contribution${totalWeekCount === 1 ? '' : 's'} (${dateRange})`;

            newGridHTML += `<div class="heatmap-cell heat-${maxLevel}" data-tooltip="${tooltip}"></div>`;
          }

          newGridHTML += '</div>';
        });

        heatmapGrid.innerHTML = newGridHTML;
      }
    } catch (err) {
      console.warn('Could not fetch live GitHub contribution heatmap:', err);
    }
  }

  loadLiveGitHubData(GITHUB_USERNAME);

  // 5. GitHub Heatmap Floating Glass Tooltip
  const heatmapGrid = document.getElementById('githubHeatmapGrid');
  let heatmapTooltip = document.getElementById('heatmapTooltip');
  if (!heatmapTooltip) {
    heatmapTooltip = document.createElement('div');
    heatmapTooltip.id = 'heatmapTooltip';
    heatmapTooltip.className = 'heatmap-tooltip';
    document.body.appendChild(heatmapTooltip);
  }

  if (heatmapGrid) {
    heatmapGrid.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.heatmap-cell');
      if (!cell) return;
      const text = cell.getAttribute('data-tooltip') || cell.getAttribute('title') || 'Contribution activity';
      if (cell.hasAttribute('title')) {
        cell.setAttribute('data-tooltip', cell.getAttribute('title'));
        cell.removeAttribute('title');
      }
      heatmapTooltip.textContent = text;
      heatmapTooltip.classList.add('visible');
    });

    heatmapGrid.addEventListener('mousemove', (e) => {
      const cell = e.target.closest('.heatmap-cell');
      if (!cell) {
        heatmapTooltip.classList.remove('visible');
        return;
      }
      heatmapTooltip.style.left = `${e.clientX}px`;
      heatmapTooltip.style.top = `${e.clientY}px`;
    });

    heatmapGrid.addEventListener('mouseout', (e) => {
      const cell = e.target.closest('.heatmap-cell');
      if (cell) {
        heatmapTooltip.classList.remove('visible');
      }
    });
  }

  // 6. Project Cards Cursor Spotlight Glow
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mouse-x', '-500px');
      card.style.setProperty('--mouse-y', '-500px');
    });
  });

  // 7. Terminal cURL Command Clipboard Copy
  const copyCurlBtn = document.getElementById('copyCurlBtn');
  const curlCopyLabel = document.getElementById('curlCopyLabel');
  const curlCopyIcon = document.getElementById('curlCopyIcon');

  if (copyCurlBtn) {
    let curlTimeout = null;
    const curlCommand = 'curl -s https://raw.githubusercontent.com/YajiHub/portfolio/main/contact.json';

    copyCurlBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(curlCommand);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = curlCommand;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }

        copyCurlBtn.classList.add('copied');
        if (curlCopyLabel) curlCopyLabel.textContent = 'Copied!';
        if (curlCopyIcon) curlCopyIcon.textContent = 'done';
        copyCurlBtn.setAttribute('aria-label', 'cURL command copied to clipboard');

        if (curlTimeout) clearTimeout(curlTimeout);
        curlTimeout = setTimeout(() => {
          copyCurlBtn.classList.remove('copied');
          if (curlCopyLabel) curlCopyLabel.textContent = 'Copy cURL';
          if (curlCopyIcon) curlCopyIcon.textContent = 'content_copy';
          copyCurlBtn.setAttribute('aria-label', 'Copy cURL command to clipboard');
        }, 2200);
      } catch (err) {
        console.error('Failed to copy curl command:', err);
        if (curlCopyLabel) curlCopyLabel.textContent = 'Error';
        setTimeout(() => {
          if (curlCopyLabel) curlCopyLabel.textContent = 'Copy cURL';
        }, 2000);
      }
    });
  }

  // 8. Interactive Game Showcase Iframe Reload Handler
  const reloadGameBtn = document.getElementById('reloadGameBtn');
  const rpsGameIframe = document.getElementById('rpsGameIframe');
  if (reloadGameBtn && rpsGameIframe) {
    reloadGameBtn.addEventListener('click', () => {
      const currentSrc = rpsGameIframe.src;
      rpsGameIframe.src = 'about:blank';
      setTimeout(() => {
        rpsGameIframe.src = currentSrc;
      }, 50);
    });
  }
});

