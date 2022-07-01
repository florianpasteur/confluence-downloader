chrome.runtime.onMessage.addListener(download);

function download(message) {
    debugger
    console.dir({message});
    if (!(message.url && message.filename)) {
        return;
    }
    chrome.downloads.download({ url: message.url, filename: message.filename }, (downloadId) => {
        if (downloadId == null) {
            if (chrome.runtime.lastError) {
                console.error(`${JSON.stringify(message)}:`, chrome.runtime.lastError.message);
            }
        }
    });
}
