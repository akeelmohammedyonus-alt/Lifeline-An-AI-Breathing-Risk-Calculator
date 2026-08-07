export function getAucklandTimeLabel(date = new Date()) {
    return new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        dateStyle: 'full',
        timeStyle: 'short'
    }).format(date);
}
