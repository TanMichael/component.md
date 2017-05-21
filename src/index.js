
const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it');
const vfs = require('vinyl-fs');
const Vinyl = require('vinyl');
const through = require('through2');
const compileVue = require('./compileVue');

const md = new MarkdownIt({
    html: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {

            try {
                console.log(compileVue(str));
                return `<pre class="hljs"><code>
                        ${hljs.highlight(lang, str).value}
                    </code></pre>
                    ${lang.toLowerCase() == 'html' ? compileVue(str) : ''}`;
            }
            catch (e) {}
        }

        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`; // use external default escaping
    }
});

md.use(require('markdown-it-anchor'), {});
let count = 0;
md.use(require('markdown-it-container'), 'DEMO', {
    render: function (tokens, idx) {
        if (tokens[idx].nesting === 1) {
            // opening tag
            return `<div class="demo demo-${++count}">\n`;
        }
        else {
            // closing tag
            return '</div>\n';
        }
    }
});

const HEADER_HTML = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Third.js document</title>
        <link rel="stylesheet" href="../static/tomorrow.css">
        <link rel="stylesheet" href="../static/doc.css">
    </head>
    <body class="page-{pageClass}">
        {beforeHTML}
        <div class="main">
            <div class="header">
                <h1><a href="index.html">前端组件开发规范</a></h1>
                <div class="header-info">这篇文档总结了我们在开发组件库VHTML时候的一些心得体会，整理出了一个我们理想中的Best Practise。希望会对你的组件库开发有一定帮助。</div>
            </div>`;
const FOOTER_HTML = `
        </div>
        <script src="../static/doc.js"></script>
    </body>
    </html>`;

function run(options) {
    const src = options && options.src || './docs/**/*.md';
    const dest = options && options.dest || './docs';
    const files = [];
    vfs.src(src)
        .pipe(through.obj(
            function (file, encoding, callback) {
                if (file.isNull() || file.contents == null) {
                    callback(null, file);
                    return;
                }

                if (file.isStream()) {
                    throw new Error('stream content is not supported');
                    return;
                }

                try {
                    files.push(Buffer.concat([
                        new Buffer('<div class="module">'),
                        new Buffer(md.render(file.contents.toString())),
                        new Buffer('</div>')
                    ]));
                }
                catch (e) {
                    console.log(e);
                    callback(e);
                }
                callback();
            },
            function (callback) {
                files.unshift(new Buffer(HEADER_HTML
                    .replace('{pageClass}', 'rules')
                    .replace('{beforeHTML}', '')
                ));
                files.push(new Buffer(FOOTER_HTML));
                // console.log(Buffer.concat(files).toString());
                this.push(new Vinyl({
                    base: dest,
                    path: `${dest}/index.html`,
                    contents: Buffer.concat(files)
                }));
                callback();
            }
        ))
        .pipe(vfs.dest(dest));
};

run();
