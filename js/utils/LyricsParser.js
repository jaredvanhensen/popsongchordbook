/**
 * LyricsParser - Handles LRC format lyrics and plain text
 */
class LyricsParser {
    /**
     * Parses LRC or plain text lyrics into a standardized format
     * @param {string} text - The raw lyrics text
     * @returns {Array} - Array of { time: seconds, text: string }
     */
    static parse(text) {
        if (!text) return [];

        const lines = text.split('\n');
        const lrcRegex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;
        const parsed = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const match = line.match(lrcRegex);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseFloat(match[2]);
                const lyricText = match[3].trim();

                const totalSeconds = (minutes * 60) + seconds;
                parsed.push({
                    time: totalSeconds,
                    text: lyricText
                });
            }
        }

        // Sort by time just in case
        return parsed.sort((a, b) => a.time - b.time);
    }

    /**
     * Strips LRC timestamps from text for plain display
     * @param {string} text - The raw lyrics text
     * @returns {string} - Clean lyrics text
     */
    static stripTimestamps(text) {
        if (!text) return '';
        // Replace [mm:ss.xx] or [mm:ss] with nothing
        return text.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
    }

    /**
     * Checks if text contains LRC-style timestamps
     * @param {string} text 
     * @returns {boolean}
     */
    static hasTimestamps(text) {
        if (!text) return false;
        return /\[\d+:\d+(?:\.\d+)?\]/.test(text);
    }
}
