// Sorter - Sorteer logica
class Sorter {
    constructor() {
        this.currentSort = {
            column: 'title',
            direction: 'asc'
        };
    }
    sort(songs, column, currentDirection) {
        const direction = currentDirection === 'asc' ? 'desc' : 'asc';
        this.currentSort = { column, direction };
        const sorted = this.applySort(songs);
        return { sorted, direction };
    }
    applySort(songs) {
        if (!this.currentSort.column) return songs;
        const { column, direction } = this.currentSort;
        return [...songs].sort((a, b) => this.compare(a, b, column, direction));
    }
    compare(a, b, column, direction) {
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

        // Special handling for CTL column (boolean based on chordData)
        if (column === 'ctl') {
            const hasTimedA = a.chordData && a.chordData.chords && a.chordData.chords.length > 0;
            const hasTimedB = b.chordData && b.chordData.chords && b.chordData.chords.length > 0;
            const aVal = hasTimedA ? 1 : 0;
            const bVal = hasTimedB ? 1 : 0;
            if (direction === 'asc') {
                return bVal - aVal; // Checkmarked first
            } else {
                return aVal - bVal; // Non-checkmarked first
            }
        }

        // Numeric sorting for ID
        if (column === 'id') {
            const aVal = parseInt(a.id) || 0;
            const bVal = parseInt(b.id) || 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
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
    }
    getCurrentSort() {
        return this.currentSort;
    }
}
