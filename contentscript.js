const nodeUpdated = [];

function nodes(selector) {
    return Array.from(document.querySelectorAll(selector));
}

async function updateNodes(settingName, selector, fn) {
    ifEnabled(settingName, () =>
        nodes(selector)
            .filter(e => !nodeUpdated.includes(e))
            .forEach(async (element, index, array) => {
                await fn(element, index, array)
                nodeUpdated.push(element);
            })
    )
}

const cache = new Map();

function ifEnabled(settingName, fn) {
    if (cache.has(settingName)) {
        if (!cache.get(settingName)) {
            fn();
        }
    } else {
        chrome.storage.sync.get([settingName], function (result) {
            cache.set(settingName, result[settingName])
            if (!cache.get(settingName)) {
                fn();
            }
        })
    }
}


function createMenuOption(content, classList, onClick) {
    const menu = document.querySelector('[role=menu]');
    const subMenu = menu.firstChild;
    const subMenuButton = subMenu.querySelector('button');

    const newSubMenu = document.createElement(subMenu.nodeName);
    newSubMenu.classList.add(...subMenu.classList.values());
    const newButton = document.createElement('button');
    newButton.classList.add(...subMenuButton.classList.values());
    newButton.classList.add(...classList);
    newButton.addEventListener('click', onClick);
    newButton.innerText = content;

    newSubMenu.appendChild(newButton);
    menu.appendChild(newSubMenu);
    return newButton;
}

const delay = milliseconds => new Promise(resolve => {
    setTimeout(resolve, milliseconds);
});

const download = async (url, name, i) => {
    // chrome.runtime.sendMessage({url, filename: name})
    setTimeout(() => {
        const a = document.createElement('a');

        a.download = name;
        a.href = url;
        a.style.display = 'none';
        a.target = "_blank";
        document.body.append(a);
        console.log(a);
        a.click();

    }, i * 1000);
};


const turndownService = new TurndownService({
    codeBlockStyle: `fenced`,
    headingStyle: `atx`,
    hr: `----------`
});

turndownService.use(turndownPluginGfm.gfm)
turndownService.use(turndownPluginGfm.tables)
turndownService.use(turndownPluginGfm.strikethrough)
turndownService.use(turndownPluginGfm.taskListItems)
turndownService.use(turndownPluginGfm.highlightedCodeBlock)

turndownService.use([
    function confluenceBlockquote (turndownService) {
        turndownService.addRule('blockquote', {
            filter: function (node) {
                return  node.dataset.panelType === "info"
            },
            replacement: function (content) {
                content = content.replace(/^\n+|\n+$/g, '')
                content = content.replace(/^/gm, '> ')
                return '\n\n' + content + '\n\n'
            }
        });
    }
])

function flatten(item) {
    const flat = [];

    item.forEach(item => {
        flat.push(flattenTokens(item))
    });

    return flat.flat();
}

function flattenTokens(token) {
    if (!token) {
        return [];
    }
    const tokens = [].concat(...(token.tokens || []), ...getTableTokens(token), ...getListTokens(token));
    return tokens.reduce((acc, t) => {
        return [...acc, ...flattenTokens(t)]
    }, [token])
}

function getTableTokens (token) {
    if (!token) {
        return [];
    }
    const tokens = []
    if (Array.isArray(token.header)) {
        tokens.push(...token.header.map(h => h.tokens).flat())
    }
    if (Array.isArray(token.rows)) {
        tokens.push(...token.rows.map(r => r.map(({tokens}) => tokens)).flat().flat())
    }
    return tokens;
}

function getListTokens (token) {
    if (!token) {
        return [];
    }
    const tokens = []
    if (Array.isArray(token.items)) {
        tokens.push(...token.items.map(i => i.tokens).flat())
    }
    return tokens;
}

function kebabCase(str) {
    return str
        .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
        .map(x => x.toLowerCase())
        .join('-');
}

setInterval(async () => {
    await updateNodes('downloadBtn', '[role=menu]', async (e) => {
        createMenuOption("Export as Markdown", [], async () => {
            const title = document.querySelector('h1').textContent || document.title || "Confluence page " + new Date();
            const titleKebabCase = kebabCase(title)
            let markdown = [`# ${title}`];
            let downloadI = 0;
            const e = document.querySelector('#main-content')
            let markdownLine = turndownService.turndown(e)
            const lexer = marked.lexer(markdownLine);
            const flatTokens = flatten(lexer);
            flatTokens.forEach(token => {
                if (token.type === "image") {
                    const url = token.href;
                    const filename = `${titleKebabCase}-${downloadI}.png`;
                    markdownLine = markdownLine.replace(url, './' + filename);
                    download(url, filename, downloadI++)
                }
            });
            markdown.push(markdownLine);

            await download('data:text/plain;charset=utf-8,' + encodeURIComponent(markdown.join('\n').replaceAll(' ', ' ')), `${titleKebabCase}.md`)
        })
    })

    await updateNodes('codeBlocks', '#main-content',() => {
        Array.from(document.querySelectorAll('code')).filter(node => node.style.whiteSpace === "pre").forEach(node => {
            node.querySelectorAll('.linenumber').forEach((node, i) => {
                node.innerHTML = " ";
            });
            const parentNode = node.parentElement;
            const pre = document.createElement(`pre`);
            parentNode.appendChild(pre);
            pre.appendChild(node); // Move the code block in a `pre` tag to keep indentation
            console.log(pre.textContent);
        })
    })

}, 500);
