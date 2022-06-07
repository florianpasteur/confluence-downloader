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


function createHtmlButton(innerHtml, classList, onClick) {
    const button = document.createElement('button');
    button.style.position = "absolute";
    button.style.bottom = "10px";
    button.style.right = "10px";
    button.style.zIndex = "9999";
    button.innerHTML = innerHtml;
    classList.forEach(className => {
        button.classList.add(className)
    })
    button.addEventListener('click', onClick);

    return button;
}

const delay = milliseconds => new Promise(resolve => {
    setTimeout(resolve, milliseconds);
});

const download = async (url, name, i) => {
    setTimeout(() => {
        const a = document.createElement('a');

        a.download = name;
        a.href = url;
        a.style.display = 'none';
        a.target = "_blank";
        document.body.append(a);
        a.click();

    }, i * 1000);
};


const turndownService = new TurndownService();
turndownService.use(turndownPluginGfm.gfm)

function flatten(item) {
    const flat = [];

    item.forEach(item => {
        if (Array.isArray(item.tokens)) {
            flat.push(...flatten(item.tokens));
        } else {
            flat.push(item);
        }
    });

    return flat;
}

function kebabCase(str) {
    return str
        .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
        .map(x => x.toLowerCase())
        .join('-');
}

setInterval(async () => {
    await updateNodes('downloadBtn', 'body', async (e) => {
        e.append(createHtmlButton('💾 Download', [], () => {
            const title = document.querySelector('h1').textContent || document.title || "Confluence page " + new Date();
            const titleKebabCase = kebabCase(title)
            let markdown = [`# ${title}`];
            let downloadI = 0;
            document.querySelectorAll('#main-content').forEach((e, i) => {
                let markdownLine = turndownService.turndown(e)
                const lexer = marked.lexer(markdownLine);
                flatten(lexer).forEach(token => {
                    if (token.type === "image") {
                        const image = lexer[0].tokens[0];
                        const url = image.href;
                        const filename = `${titleKebabCase}-${downloadI}.png`;
                        markdownLine = markdownLine.replace(url, './' + filename);
                        download(url, filename, downloadI++)
                    }
                });
                markdown.push(markdownLine);
            })
            download('data:text/plain;charset=utf-8,' + encodeURIComponent(markdown.join('\n')), `${titleKebabCase}.md`)
        }))
    })
}, 500);
