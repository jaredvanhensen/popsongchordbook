
const testStrings = [
    "C G D",
    "A long time ago",
    "Go home",
    "Am I wrong",
    "G/B D/F#",
    "Hello World",
    "Be careful",
    "At the start",
    "Dm7 G7 Cmaj7",
    "It is a C chord",
    "(C) [G]",
    "F#m7b5"
];

// Original Regex (approximate based on file)
// const originalPattern = /([A-Ga-g][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug)?[0-9]?(?:\/[A-Ga-g][#b]?)?)/g;

// Proposed Regex with Lookbehind/Lookahead and Capital Constraint
// Note: JS Lookbehind might depend on Node version. Node 14+ supports it.
const proposedPattern = /(?:^|(?<=[\s,.;:(\[]))([A-G][#b]?(?:m|min|maj|dim|aug|sus|add|[0-9]|sus[24]|add[29]|maj[79]|min[79]|dim[79]|aug)*(?:\/[A-G][#b]?)?)(?=$|[\s,.;:)\]])/g;

console.log("Testing Proposed Pattern:");
testStrings.forEach(str => {
    const matches = str.match(proposedPattern);
    console.log(`"${str}" -> Matches: ${matches ? matches.join(', ') : 'None'}`);
});
