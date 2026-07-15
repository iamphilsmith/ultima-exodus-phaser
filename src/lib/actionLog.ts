export function logAction(message: string, blocked = false) {
    const list = document.getElementById('action-list')
    if (!list) return

    const item = document.createElement('li')
    item.textContent = message
    if (blocked) item.classList.add('blocked')

    list.prepend(item)

    // Keep log from growing forever
    while (list.children.length > 50) {
        list.removeChild(list.lastChild!)
    }
}