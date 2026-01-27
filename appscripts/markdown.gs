/*
 * markdown.gs
 * Google Apps Script helper for rendering GitHub-flavored Markdown into HTML.
 * Exposes two objects:
 *  - markdown: public API with methods string, fileUrl, releaseUrl
 *  - markdownLib: internal helpers used by markdown
 *
 * Usage examples:
 *   var htmlOutput = markdown.string('# Hello');
 *   var htmlFromFile = markdown.fileUrl('https://github.com/TenCommands/acad_grading_tools/blob/main/readme.md');
 *   var htmlFromRelease = markdown.releaseUrl('https://github.com/TenCommands/acad_grading_tools/releases/tag/v126.201.013gs');
 */

var markdownLib = {
	fetchText: function (url, options) {
		options = options || {};
		var fetchOpt = { muteHttpExceptions: true };
		if (options.method) fetchOpt.method = options.method;
		if (options.payload) fetchOpt.payload = options.payload;
		if (options.contentType) fetchOpt.contentType = options.contentType;
		if (!fetchOpt.headers) fetchOpt.headers = {};
		fetchOpt.headers['User-Agent'] = 'AppsScript';
		if (options.headers) {
			for (var h in options.headers) fetchOpt.headers[h] = options.headers[h];
		}
		var res = UrlFetchApp.fetch(url, fetchOpt);
		return { code: res.getResponseCode(), text: res.getContentText(), raw: res }; 
	},

	parseGithubUrl: function (url) {
		// Recognize GitHub file URLs and release tag URLs
		// examples:
		// https://github.com/owner/repo/blob/branch/path/to/file.md
		// https://github.com/owner/repo/releases/tag/v1.2.3
		var blobRe = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/i;
		var releaseRe = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/([^\/\?#]+)/i;
		var m = url.match(blobRe);
		if (m) return { type: 'blob', owner: m[1], repo: m[2], ref: m[3], path: m[4] };
		m = url.match(releaseRe);
		if (m) return { type: 'release', owner: m[1], repo: m[2], tag: m[3] };
		// raw.githubusercontent direct link
		var rawRe = /https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/(refs\/heads\/[^\/]+|refs\/tags\/[^\/]+|[^\/]+)\/(.+)/i;
		m = url.match(rawRe);
		if (m) return { type: 'raw', owner: m[1], repo: m[2], ref: m[3], path: m[4] };
		return null;
	},

	blobToRaw: function (owner, repo, ref, path) {
		// Use refs/heads for branches if not already refs/...
		var refPart = ref;
		if (!/^refs\//.test(refPart)) {
			// Keep branch mapping as refs/heads/{branch} per user's requirement
			refPart = 'refs/heads/' + refPart;
		}
		return 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + refPart + '/' + path;
	},

	tagToApiRelease: function (owner, repo, tag) {
		return 'https://api.github.com/repos/' + owner + '/' + repo + '/releases/tags/' + encodeURIComponent(tag);
	},

	normalizePathParts: function (parts) {
		var out = [];
		for (var i = 0; i < parts.length; i++) {
			var p = parts[i];
			if (p === '' || p === '.') continue;
			if (p === '..') { out.pop(); continue; }
			out.push(p);
		}
		return out;
	},

	resolveRelative: function (basePath, rel) {
		// basePath is directory part (may be empty). rel is relative path.
		if (/^https?:\/\//i.test(rel) || rel.indexOf('mailto:') === 0 || rel.indexOf('#') === 0 || rel.indexOf('data:') === 0) return rel;
		if (rel.indexOf('/') === 0) {
			// repository-root-anchored path (remove leading slash)
			return rel.replace(/^\//, '');
		}
		var baseParts = basePath ? basePath.split('/') : [];
		var relParts = rel.split('/');
		var parts = baseParts.concat(relParts);
		return markdownLib.normalizePathParts(parts).join('/');
	},

	rewriteLocalReferences: function (markdownText, context) {
		// context: { owner, repo, ref, basePath, refType }
		// Replace markdown links/images and HTML src/href attributes

		// 1) Convert any GitHub blob links to their raw counterparts
		markdownText = markdownText.replace(/https?:\/\/github\.com\/[^)\s'">]+/gi, function (match) {
			var parsed = markdownLib.parseGithubUrl(match);
			if (parsed && parsed.type === 'blob') return markdownLib.blobToRaw(parsed.owner, parsed.repo, parsed.ref, parsed.path);
			return match;
		});

		// Helper to convert relative link to raw url when repo context given
		function toRawIfRelative(url) {
			if (!context || !context.owner || !context.repo || !context.ref) return url;
			if (/^https?:\/\//i.test(url) || url.indexOf('mailto:') === 0 || url.indexOf('#') === 0 || url.indexOf('data:') === 0) return url;
			var resolved = markdownLib.resolveRelative(context.basePath || '', url);
			var refPart = context.ref;
			if (!/^refs\//.test(refPart)) {
				if (context.refType === 'tag') refPart = 'refs/tags/' + refPart; else refPart = 'refs/heads/' + refPart;
			}
			return 'https://raw.githubusercontent.com/' + context.owner + '/' + context.repo + '/' + refPart + '/' + resolved;
		}

		// Replace Markdown links and images: ![alt](url) and [text](url)
		markdownText = markdownText.replace(/(!?\[[^\]]*\]\()([^\)\s]+)(\))/g, function (_, a, url, b) {
			var newUrl = toRawIfRelative(url);
			return a + newUrl + b;
		});

		// Replace HTML attributes src/href in tags
		markdownText = markdownText.replace(/(src|href)=(["'])([^"']+)(["'])/gi, function (_, attr, q1, url, q2) {
			var newUrl = toRawIfRelative(url);
			return attr + '=' + q1 + newUrl + q2;
		});

		return markdownText;
	},

	renderWithGitHubMarkdown: function (mdText, repoContext) {
		var payload = { text: mdText, mode: 'gfm' };
		if (repoContext && repoContext.owner && repoContext.repo) payload.context = repoContext.owner + '/' + repoContext.repo;
		var options = {
			method: 'post',
			contentType: 'application/json; charset=utf-8',
			payload: JSON.stringify(payload),
			headers: { 'Accept': 'application/vnd.github+json' }
		};
		var res = markdownLib.fetchText('https://api.github.com/markdown', options);
		if (res.code >= 200 && res.code < 300) return res.text;
		// Fallback: return escaped markdown as preformatted block if API fails
		return '<pre>' + markdownLib.escapeHtml(mdText) + '</pre>';
	},

	clientHtmlFor: function (mdText) {
		// Build a self-contained HTML page that renders Markdown client-side
		// Uses marked (+footnotes) and highlight.js to approximate GitHub rendering,
		// and converts admonition-style blockquotes into styled divs.
		var escaped = JSON.stringify(mdText);
		var html = '' +
			'<!DOCTYPE html>' +
			'<html>' +
			'<head>' +
			'<base target="_top">' +
			'<meta charset="utf-8">' +
			'<script src="https://cdn.jsdelivr.net/npm/marked-footnote/dist/index.umd.js"></script>' +
			'<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>' +
			'<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">' +
			'<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js"></script>' +
			'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css">' +
			'<style>' +
			'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 16px; }' +
			'.markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 16px; }' +
			'pre { background: #f6f8fa; padding: 10px; border-radius: 4px; overflow-x: auto; }' +
			'.admonition { margin: 12px 0; padding: 12px; border-left: 4px solid; border-radius: 4px; }' +
			'.admonition.note { background: #e7f3ff; border-color: #1a73e8; }' +
			'.admonition.warning { background: #fff4e5; border-color: #f9ab00; }' +
			'.admonition.tip { background: #e6fffa; border-color: #10b981; }' +
			'.admonition.important { background: #f0f4ff; border-color: #6366f1; }' +
			'.admonition.caution { background: #fff1f2; border-color: #ef4444; }' +
			'</style>' +
			'</head>' +
			'<body>' +
			'<article class="markdown-body" id="content"></article>' +
			'<script>' +
			'marked.setOptions({ gfm: true, breaks: true, headerIds: true, highlight: function(code, lang) {' +
			'try { return hljs.highlightAuto(code, lang ? [lang] : undefined).value; } catch(e) { return code; } } });' +
			'if (typeof markedFootnote === "function") { marked.use(markedFootnote()); }' +
			'var md = ' + escaped + ';' +
			'var html = marked.parse(md);' +
			'var container = document.createElement("div"); container.innerHTML = html;' +
			'// Convert admonition markers written using the ::: syntax into styled divs' +
			'container.querySelectorAll("blockquote").forEach(function(bq) {' +
			'  var first = bq.firstElementChild; if (!first) return; var ft = first.textContent || ""; if (!ft.startsWith(":::")) return; ' +
			'  var marker = ft.replace(/^:::/, "").trim(); first.remove(); ' +
			'  var last = bq.lastElementChild; if (last && (last.textContent || "").trim() === ":::") last.remove(); ' +
			'  var div = document.createElement("div"); var cls = "admonition"; ' +
			'  // marker may be like admonition-note or simply note' +
			'  var type = marker.replace(/^admonition-/, "").trim(); div.className = cls + " " + type; div.innerHTML = bq.innerHTML; bq.replaceWith(div);' +
			'});' +
			'document.getElementById("content").appendChild(container);' +
			'</script>' +
			'</body>' +
			'</html>';
		return html;
	},

	escapeHtml: function (s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
};

var markdown = {
	string: function (mdString) {
		// Prefer server-side GitHub rendering (more reliable in Apps Script).
		var rendered = markdownLib.renderWithGitHubMarkdown(mdString, null);
		// If the renderer fell back to a plain escaped <pre>, use client-side page for best UX
		if (rendered && rendered.indexOf('<pre>') === 0) {
			var pre = markdownLib.rewriteLocalReferences(mdString, null);
			var html = markdownLib.clientHtmlFor(pre);
			return HtmlService.createHtmlOutput(html).setSandboxMode(HtmlService.SandboxMode.IFRAME);
		}
		// Wrap server-rendered fragment in a minimal HTML page with GitHub markdown CSS
		var full = '<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css"><style>body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding:16px;} .markdown-body{box-sizing:border-box;min-width:200px;max-width:980px;margin:0 auto;padding:16px;}</style></head><body><article class="markdown-body">' + rendered + '</article></body></html>';
		return HtmlService.createHtmlOutput(full).setSandboxMode(HtmlService.SandboxMode.IFRAME);
	},

	fileUrl: function (fileUrl) {
		// If fileUrl points to a github.com blob path, fetch the raw file then rewrite relative links
		var parsed = markdownLib.parseGithubUrl(fileUrl);
		if (parsed && parsed.type === 'blob') {
			var owner = parsed.owner, repo = parsed.repo, ref = parsed.ref, path = parsed.path;
			var raw = markdownLib.blobToRaw(owner, repo, ref, path);
			var fetched = markdownLib.fetchText(raw);
			var mdText = fetched.text;
			var basePath = path.split('/').slice(0, -1).join('/');
			var context = { owner: owner, repo: repo, ref: ref, basePath: basePath, refType: 'branch' };
			var rewritten = markdownLib.rewriteLocalReferences(mdText, context);
			// Try server-side render first (uses GitHub API)
			var rendered = markdownLib.renderWithGitHubMarkdown(rewritten, { owner: owner, repo: repo });
			if (rendered && rendered.indexOf('<pre>') !== 0) {
				var full = '<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css"><style>body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding:16px;} .markdown-body{box-sizing:border-box;min-width:200px;max-width:980px;margin:0 auto;padding:16px;}</style></head><body><article class="markdown-body">' + rendered + '</article></body></html>';
				return HtmlService.createHtmlOutput(full).setSandboxMode(HtmlService.SandboxMode.IFRAME);
			}
			// Fallback to client-side rendering if server-side returned escaped content
			var html = markdownLib.clientHtmlFor(rewritten);
			return HtmlService.createHtmlOutput(html).setSandboxMode(HtmlService.SandboxMode.IFRAME);
		}

		// If it's a raw.githubusercontent link or any URL to file, just fetch and render
		try {
			var fetchedAny = markdownLib.fetchText(fileUrl);
			var txt = fetchedAny.text;
			var htmlAny = markdownLib.clientHtmlFor(txt);
			return HtmlService.createHtmlOutput(htmlAny).setSandboxMode(HtmlService.SandboxMode.IFRAME);
		} catch (e) {
			return HtmlService.createHtmlOutput('<pre>Failed to fetch file: ' + String(e) + '</pre>');
		}
	},

	releaseUrl: function (releaseUrl) {
		// Parse release tag URL, fetch release JSON via GitHub API, take 'body' field
		var parsed = markdownLib.parseGithubUrl(releaseUrl);
		if (parsed && parsed.type === 'release') {
			var api = markdownLib.tagToApiRelease(parsed.owner, parsed.repo, parsed.tag);
			var res = markdownLib.fetchText(api, { headers: { 'Accept': 'application/vnd.github+json' } });
			if (res.code >= 200 && res.code < 300) {
				try {
					var obj = JSON.parse(res.text);
					var body = obj.body || '';
					var context = { owner: parsed.owner, repo: parsed.repo, ref: parsed.tag, basePath: '', refType: 'tag' };
					  var rewritten = markdownLib.rewriteLocalReferences(body, context);
					  var rendered = markdownLib.renderWithGitHubMarkdown(rewritten, { owner: parsed.owner, repo: parsed.repo });
					  if (rendered && rendered.indexOf('<pre>') !== 0) {
						var full = '<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css"><style>body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding:16px;} .markdown-body{box-sizing:border-box;min-width:200px;max-width:980px;margin:0 auto;padding:16px;}</style></head><body><article class="markdown-body">' + rendered + '</article></body></html>';
						return HtmlService.createHtmlOutput(full).setSandboxMode(HtmlService.SandboxMode.IFRAME);
					  }
					  var html = markdownLib.clientHtmlFor(rewritten);
					  return HtmlService.createHtmlOutput(html).setSandboxMode(HtmlService.SandboxMode.IFRAME);
				} catch (e) {
					return HtmlService.createHtmlOutput('<pre>Failed to parse release JSON: ' + String(e) + '</pre>');
				}
			} else {
				return HtmlService.createHtmlOutput('<pre>Failed to fetch release: HTTP ' + res.code + '</pre>');
			}
		}
		return HtmlService.createHtmlOutput('<pre>Invalid GitHub release URL</pre>');
	}
};

function testMarkdown(){
  const html = markdown.fileUrl("https://github.com/TenCommands/acad_grading_tools/blob/main/readme.md")
  SpreadsheetApp.getUi().showModalDialog(html, "Markdown")
}
