const options = [
    'downloadBtn',
];

chrome.storage.sync.get(options, function (result) {
    options.forEach(option => {
        console.log(result);
        const checkbox = document.querySelector('#' + option);
        if (!result[option]) {
            checkbox.setAttribute('checked', 'checked');
        } else {
            checkbox.removeAttribute('checked');
        }
    });
});

options.forEach(option => {
    const checkbox = document.querySelector('#' + option);
    checkbox.addEventListener('change', e => {
        debugger
        chrome.storage.sync.set({[option]: !e.srcElement.checked}, function () {
        });
    });
})
