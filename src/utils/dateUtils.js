export function getFormattedToday() {
    return new Date().toISOString().split('T')[0];
}

export function getDaysDiff(dueDateStr) {
    if (!dueDateStr) return 999;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

