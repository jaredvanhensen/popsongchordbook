/**
 * SEO Utilities for PopSongChordBook
 */
const SEO = {
    /**
     * Converts a string into a URL-friendly slug.
     * @param {string} text 
     * @returns {string}
     */
    slugify: function(text) {
        if (!text) return "";
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    },

    /**
     * Gets the public URL for a song.
     * @param {string} artist 
     * @param {string} title 
     * @returns {string}
     */
    getSongUrl: function(artist, title) {
        return `/song/${this.slugify(artist + "-" + title)}`;
    },

    /**
     * Gets the public URL for an artist.
     * @param {string} artist 
     * @returns {string}
     */
    getArtistUrl: function(artist) {
        return `/artist/${this.slugify(artist)}`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEO;
}
