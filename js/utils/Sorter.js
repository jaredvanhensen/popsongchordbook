// Sorter - Sorteer logica
class Sorter {
    constructor() {
        this.currentSort = {
            column: null,
            direction: 'asc'
        };
    }

    sort(songs, column, currentDirection) {
        const direction = currentDirection === 'asc' ? 'desc' : 'asc';
        this.currentSort = { column, direction };

        const sorted = [...songs].sort((a, b) => {
            // Special handling for favorite column (boolean)
            if (column === 'favorite') {
                const aVal = a.favorite ? 1 : 0;
                const bVal = b.favorite ? 1 : 0;
                if (direction === 'asc') {
                    return bVal - aVal; // Favorites first
                } else {
                    return aVal - bVal; // Non-favorites first
                }
            }
            
            let aVal = a[column] || '';
            let bVal = b[column] || '';

            // Normalize for sorting (case-insensitive)
            aVal = aVal.toString().toLowerCase().trim();
            bVal = bVal.toString().toLowerCase().trim();

            if (direction === 'asc') {
                return aVal.localeCompare(bVal, 'nl');
            } else {
                return bVal.localeCompare(aVal, 'nl');
            }
        });

        return { sorted, direction };
    }

    getCurrentSort() {
        return this.currentSort;
    }
}

