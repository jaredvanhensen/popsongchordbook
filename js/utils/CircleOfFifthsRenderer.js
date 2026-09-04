/**
 * CircleOfFifthsRenderer.js
 * Utility to render an interactive Circle of Fifths SVG diagram inside a container.
 *
 * Signature: initCircleOfFifths(container, keyOverride, onChordDblClick, onKeySelected)
 *   - container      : DOM element to render into (falls back to #circleOfFifthsSvgContainer)
 *   - keyOverride    : string key (e.g. "C", "Am") or null/'' for "no key set" mode
 *   - onChordDblClick: callback(chordName) when user double-clicks a sector
 *   - onKeySelected  : callback(keyName, isMajor) when user long-presses (2 s) a sector to set key
 *
 * Behaviour when keyOverride is null / empty string:
 *   - All sectors are rendered at full opacity (no blur, no highlight)
 *   - A hint "hold 2s = set key" is shown in the centre
 *   - Long-pressing any sector for 2 s calls onKeySelected with the chord name
 *
 * Behaviour when keyOverride is set:
 *   - Diatonic sectors (tonic + two nearest neighbours) are fully opaque
 *   - Non-diatonic sectors are dimmed (opacity 0.55 major / 0.45 minor)
 *   - The tonic sector gets a highlight outline
 */

function initCircleOfFifths(containerOverride, keyOverride, onChordDblClick, onKeySelected) {
    const container = containerOverride || document.getElementById('circleOfFifthsSvgContainer');
    if (!container) return;

    // Determine whether a key is actually set
    const hasKey = keyOverride !== null && keyOverride !== undefined && String(keyOverride).trim() !== '';
    const activeKey = hasKey ? String(keyOverride).trim() : '';

    // Clear any existing contents
    container.innerHTML = '';

    const keysMatch = (k1, k2) => {
        if (!k1 || !k2) return false;
        const normalize = (k) => {
            k = k.trim();
            const map = {
                'A#': 'Bb', 'A#m': 'Bbm',
                'C#': 'Db', 'C#m': 'Bbm',
                'D#': 'Eb', 'D#m': 'Ebm',
                'F#': 'Gb', 'Gb': 'Gb',
                'G#': 'Ab', 'Ab': 'Ab',
                'G#m': 'Abm', 'Abm': 'Abm'
            };
            return map[k] || k;
        };
        const n1 = normalize(k1);
        const n2 = normalize(k2);
        if (n1 === n2) return true;
        if (k2.includes(' ')) {
            return k2.split(' ').some(part => normalize(part) === n1);
        }
        return false;
    };

    let highlightPathD = null;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 300 300");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.borderRadius = "50%";
    svg.style.overflow = "hidden";
    svg.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";

    const cx = 150;
    const cy = 150;
    const rOutMajor = 150;
    const rInMajor = 95;
    const rOutMinor = 95;
    const rInMinor = 42;

    const data = [
        { major: "C", minor: "Am", color: "#e63946" },
        { major: "G", minor: "Em", color: "#f4a261" },
        { major: "D", minor: "Bm", color: "#e9c46a" },
        { major: "A", minor: "F#m", color: "#76c893" },
        { major: "E", minor: "C#m", color: "#40916c" },
        { major: "B", minor: "G#m", color: "#1a9396" },
        { major: "Gb F#", minor: "Ebm", color: "#00b4d8", majorVal: "F#", minorVal: "Ebm" },
        { major: "Db", minor: "Bbm", color: "#0077b6" },
        { major: "Ab", minor: "Fm", color: "#1d3557" },
        { major: "Eb", minor: "Cm", color: "#7209b7" },
        { major: "Bb", minor: "Gm", color: "#b5179e" },
        { major: "F", minor: "Dm", color: "#f72585" }
    ];

    let tonicIndex = 0;
    let isMinorKey = false;
    if (hasKey) {
        for (let idx = 0; idx < data.length; idx++) {
            if (keysMatch(activeKey, data[idx].major) || (data[idx].majorVal && keysMatch(activeKey, data[idx].majorVal))) {
                tonicIndex = idx;
                isMinorKey = false;
                break;
            }
            if (keysMatch(activeKey, data[idx].minor) || (data[idx].minorVal && keysMatch(activeKey, data[idx].minorVal))) {
                tonicIndex = idx;
                isMinorKey = true;
                break;
            }
        }
    }

    const getSectorPath = (rIn, rOut, startAngle, endAngle) => {
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;

        const xOutStart = cx + rOut * Math.cos(startRad);
        const yOutStart = cy + rOut * Math.sin(startRad);
        const xOutEnd = cx + rOut * Math.cos(endRad);
        const yOutEnd = cy + rOut * Math.sin(endRad);

        const xInStart = cx + rIn * Math.cos(startRad);
        const yInStart = cy + rIn * Math.sin(startRad);
        const xInEnd = cx + rIn * Math.cos(endRad);
        const yInEnd = cy + rIn * Math.sin(endRad);

        return `M ${xOutStart} ${yOutStart} 
                A ${rOut} ${rOut} 0 0 1 ${xOutEnd} ${yOutEnd} 
                L ${xInEnd} ${yInEnd} 
                A ${rIn} ${rIn} 0 0 0 ${xInStart} ${yInStart} 
                Z`;
    };

    // ── Long-press state ─────────────────────────────────────────────────────
    const LONG_PRESS_DURATION = 2000; // ms total to set key
    const LONG_PRESS_SHOW_DELAY = 1000; // ms before progress ring becomes visible (prevents flash on normal clicks)
    let longPressTimer = null;
    let longPressShowTimer = null;
    let longPressOverlay = null;

    function showLongPressProgress(duration) {
        if (longPressOverlay && longPressOverlay.parentNode) {
            longPressOverlay.parentNode.removeChild(longPressOverlay);
        }
        longPressOverlay = document.createElementNS(svgNS, 'g');
        longPressOverlay.style.pointerEvents = 'none';

        // Animated ring sweeping around the outer rim
        const ringR = (rOutMajor + rInMajor) / 2;
        const ringCircumference = 2 * Math.PI * ringR;
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('cx', cx);
        ring.setAttribute('cy', cy);
        ring.setAttribute('r', ringR);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', 'rgba(255,255,255,0.9)');
        ring.setAttribute('stroke-width', '5');
        ring.setAttribute('stroke-dasharray', ringCircumference);
        ring.setAttribute('stroke-dashoffset', ringCircumference);
        ring.setAttribute('stroke-linecap', 'round');
        ring.style.transform = 'rotate(-90deg)';
        ring.style.transformOrigin = '150px 150px';
        ring.style.transition = `stroke-dashoffset ${duration}ms linear`;
        longPressOverlay.appendChild(ring);
        svg.appendChild(longPressOverlay);

        // Kick off the transition on the next two animation frames
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ring.setAttribute('stroke-dashoffset', '0');
            });
        });
    }

    function cancelLongPress() {
        if (longPressShowTimer) { clearTimeout(longPressShowTimer); longPressShowTimer = null; }
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (longPressOverlay && longPressOverlay.parentNode) {
            longPressOverlay.parentNode.removeChild(longPressOverlay);
            longPressOverlay = null;
        }
    }

    /**
     * Attaches a hold gesture to a sector <g>.
     * Only active when onKeySelected callback is provided.
     * Starts showing the progress ring after 1s of holding.
     */
    function attachLongPress(g, chordName, isMajor) {
        if (typeof onKeySelected !== 'function') return;

        g.addEventListener('pointerdown', () => {
            cancelLongPress();
            
            // Only show the progress ring after holding for 1 second (so normal clicks never show it)
            const remainingDuration = LONG_PRESS_DURATION - LONG_PRESS_SHOW_DELAY;
            longPressShowTimer = setTimeout(() => {
                longPressShowTimer = null;
                showLongPressProgress(remainingDuration);
            }, LONG_PRESS_SHOW_DELAY);

            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                if (longPressShowTimer) { clearTimeout(longPressShowTimer); longPressShowTimer = null; }
                if (longPressOverlay && longPressOverlay.parentNode) {
                    longPressOverlay.parentNode.removeChild(longPressOverlay);
                    longPressOverlay = null;
                }
                onKeySelected(chordName, isMajor);
            }, LONG_PRESS_DURATION);
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
            g.addEventListener(evt, cancelLongPress);
        });
    }

    // ── Render all sectors ───────────────────────────────────────────────────
    data.forEach((item, i) => {
        const startAngle = -15 + i * 30;
        const endAngle = 15 + i * 30;
        const midAngle = i * 30;
        const rad = (midAngle - 90) * Math.PI / 180;

        const isCurrentMajor = hasKey && (keysMatch(activeKey, item.major) || (item.majorVal && keysMatch(activeKey, item.majorVal)));
        const isCurrentMinor = hasKey && (keysMatch(activeKey, item.minor) || (item.minorVal && keysMatch(activeKey, item.minorVal)));

        if (isCurrentMajor) {
            highlightPathD = getSectorPath(rInMajor, rOutMajor, startAngle, endAngle);
        } else if (isCurrentMinor) {
            highlightPathD = getSectorPath(rInMinor, rOutMinor, startAngle, endAngle);
        }

        // When no key is set, every sector is fully visible ("diatonic")
        const isDiatonic = !hasKey || (i === tonicIndex || i === ((tonicIndex - 1 + 12) % 12) || i === ((tonicIndex + 1 + 12) % 12));

        let romanNumeralMajor = "";
        let romanNumeralMinor = "";

        if (hasKey && isDiatonic) {
            if (!isMinorKey) {
                if (i === tonicIndex) {
                    romanNumeralMajor = "I"; romanNumeralMinor = "vi";
                } else if (i === ((tonicIndex - 1 + 12) % 12)) {
                    romanNumeralMajor = "IV"; romanNumeralMinor = "ii";
                } else if (i === ((tonicIndex + 1 + 12) % 12)) {
                    romanNumeralMajor = "V"; romanNumeralMinor = "iii";
                }
            } else {
                if (i === tonicIndex) {
                    romanNumeralMajor = "III"; romanNumeralMinor = "i";
                } else if (i === ((tonicIndex - 1 + 12) % 12)) {
                    romanNumeralMajor = "VI"; romanNumeralMinor = "iv";
                } else if (i === ((tonicIndex + 1 + 12) % 12)) {
                    romanNumeralMajor = "VII"; romanNumeralMinor = "v";
                }
            }
        }

        // ─── Major outer slice ────────────────────────────────────────────
        const majorG = document.createElementNS(svgNS, "g");
        majorG.style.cursor = "pointer";

        const majorPath = document.createElementNS(svgNS, "path");
        majorPath.setAttribute("d", getSectorPath(rInMajor, rOutMajor, startAngle, endAngle));
        majorPath.setAttribute("fill", item.color);
        majorPath.setAttribute("stroke", "white");
        majorPath.setAttribute("stroke-width", "1");
        majorPath.style.transition = "opacity 0.2s, filter 0.2s";

        const defaultOpacityMajor = isDiatonic ? "1.0" : "0.55";
        majorPath.setAttribute("opacity", defaultOpacityMajor);

        const majorVal = item.majorVal || item.major;

        const handleMajorClick = (e) => {
            if (e) e.preventDefault();
            if (typeof initAudio === 'function') initAudio();
            if (typeof triggerChordAudio === 'function') {
                triggerChordAudio(majorVal, 2.0, true);
            } else if (window.appInstance && window.appInstance.songDetailModal && window.appInstance.songDetailModal.sharedAudioPlayer) {
                const modal = window.appInstance.songDetailModal;
                const parsed = modal.chordParser ? modal.chordParser.parse(majorVal) : null;
                if (parsed && parsed.notes) {
                    modal.sharedAudioPlayer.initialize().then(() => {
                        modal.sharedAudioPlayer.playChord(parsed.notes, 2.0);
                    });
                }
            }
            if (typeof enableTimingCapture !== 'undefined' && enableTimingCapture && typeof recordChord === 'function') {
                recordChord(majorVal);
            }
        };
        majorG.addEventListener('pointerdown', handleMajorClick);

        if (typeof onChordDblClick === 'function') {
            majorG.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onChordDblClick(majorVal);
            });
        }

        attachLongPress(majorG, majorVal, true);

        const rTextMajor = (rInMajor + rOutMajor) / 2;
        const xTextMajor = cx + rTextMajor * Math.cos(rad);
        const yTextMajor = cy + rTextMajor * Math.sin(rad);

        const textMajor = document.createElementNS(svgNS, "text");
        textMajor.setAttribute("x", xTextMajor);
        textMajor.setAttribute("y", romanNumeralMajor ? yTextMajor - 3 : yTextMajor + 4);
        textMajor.setAttribute("text-anchor", "middle");
        textMajor.setAttribute("fill", "white");
        textMajor.setAttribute("font-size", item.major.length > 3 ? "11" : "15");
        textMajor.setAttribute("font-weight", "900");
        textMajor.setAttribute("font-family", "'Inter', sans-serif");
        textMajor.style.pointerEvents = "none";
        textMajor.textContent = item.major;
        textMajor.setAttribute("opacity", defaultOpacityMajor);

        let romanTextMajor = null;
        if (romanNumeralMajor) {
            romanTextMajor = document.createElementNS(svgNS, "text");
            romanTextMajor.setAttribute("x", xTextMajor);
            romanTextMajor.setAttribute("y", yTextMajor + 9);
            romanTextMajor.setAttribute("text-anchor", "middle");
            romanTextMajor.setAttribute("fill", "rgba(255, 255, 255, 0.85)");
            romanTextMajor.setAttribute("font-size", "9.5");
            romanTextMajor.setAttribute("font-weight", "700");
            romanTextMajor.setAttribute("font-family", "'Inter', sans-serif");
            romanTextMajor.style.pointerEvents = "none";
            romanTextMajor.textContent = romanNumeralMajor;
            romanTextMajor.setAttribute("opacity", defaultOpacityMajor);
        }

        majorG.addEventListener('mouseenter', () => {
            majorPath.setAttribute("opacity", isDiatonic ? "0.85" : "0.65");
            majorPath.style.filter = "brightness(1.1) drop-shadow(0px 0px 4px rgba(0,0,0,0.25))";
            textMajor.setAttribute("opacity", "1.0");
            if (romanTextMajor) romanTextMajor.setAttribute("opacity", "1.0");
        });
        majorG.addEventListener('mouseleave', () => {
            majorPath.setAttribute("opacity", defaultOpacityMajor);
            majorPath.style.filter = "none";
            textMajor.setAttribute("opacity", defaultOpacityMajor);
            if (romanTextMajor) romanTextMajor.setAttribute("opacity", defaultOpacityMajor);
        });

        majorG.appendChild(majorPath);
        majorG.appendChild(textMajor);
        if (romanTextMajor) majorG.appendChild(romanTextMajor);
        svg.appendChild(majorG);

        // ─── Minor inner slice ────────────────────────────────────────────
        const minorG = document.createElementNS(svgNS, "g");
        minorG.style.cursor = "pointer";

        const minorPath = document.createElementNS(svgNS, "path");
        minorPath.setAttribute("d", getSectorPath(rInMinor, rOutMinor, startAngle, endAngle));
        minorPath.setAttribute("fill", item.color);
        const defaultOpacityMinor = isDiatonic ? "0.85" : "0.45";
        minorPath.setAttribute("opacity", defaultOpacityMinor);
        minorPath.setAttribute("stroke", "white");
        minorPath.setAttribute("stroke-width", "1");
        minorPath.style.transition = "opacity 0.2s, filter 0.2s";

        const minorVal = item.minorVal || item.minor;

        const handleMinorClick = (e) => {
            if (e) e.preventDefault();
            if (typeof initAudio === 'function') initAudio();
            if (typeof triggerChordAudio === 'function') {
                triggerChordAudio(minorVal, 2.0, true);
            } else if (window.appInstance && window.appInstance.songDetailModal && window.appInstance.songDetailModal.sharedAudioPlayer) {
                const modal = window.appInstance.songDetailModal;
                const parsed = modal.chordParser ? modal.chordParser.parse(minorVal) : null;
                if (parsed && parsed.notes) {
                    modal.sharedAudioPlayer.initialize().then(() => {
                        modal.sharedAudioPlayer.playChord(parsed.notes, 2.0);
                    });
                }
            }
            if (typeof enableTimingCapture !== 'undefined' && enableTimingCapture && typeof recordChord === 'function') {
                recordChord(minorVal);
            }
        };
        minorG.addEventListener('pointerdown', handleMinorClick);

        if (typeof onChordDblClick === 'function') {
            minorG.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onChordDblClick(minorVal);
            });
        }

        attachLongPress(minorG, minorVal, false);

        const rTextMinor = (rInMinor + rOutMinor) / 2;
        const xTextMinor = cx + rTextMinor * Math.cos(rad);
        const yTextMinor = cy + rTextMinor * Math.sin(rad);

        const textMinor = document.createElementNS(svgNS, "text");
        textMinor.setAttribute("x", xTextMinor);
        textMinor.setAttribute("y", romanNumeralMinor ? yTextMinor - 3 : yTextMinor + 3);
        textMinor.setAttribute("text-anchor", "middle");
        textMinor.setAttribute("fill", "white");
        textMinor.setAttribute("font-size", item.minor.length > 3 ? "9" : "12");
        textMinor.setAttribute("font-weight", "700");
        textMinor.setAttribute("font-family", "'Inter', sans-serif");
        textMinor.style.pointerEvents = "none";
        textMinor.textContent = item.minor;
        textMinor.setAttribute("opacity", defaultOpacityMinor);

        let romanTextMinor = null;
        if (romanNumeralMinor) {
            romanTextMinor = document.createElementNS(svgNS, "text");
            romanTextMinor.setAttribute("x", xTextMinor);
            romanTextMinor.setAttribute("y", yTextMinor + 7);
            romanTextMinor.setAttribute("text-anchor", "middle");
            romanTextMinor.setAttribute("fill", "rgba(255, 255, 255, 0.8)");
            romanTextMinor.setAttribute("font-size", "7.5");
            romanTextMinor.setAttribute("font-weight", "700");
            romanTextMinor.setAttribute("font-family", "'Inter', sans-serif");
            romanTextMinor.style.pointerEvents = "none";
            romanTextMinor.textContent = romanNumeralMinor;
            romanTextMinor.setAttribute("opacity", defaultOpacityMinor);
        }

        minorG.addEventListener('mouseenter', () => {
            minorPath.setAttribute("opacity", isDiatonic ? "0.70" : "0.58");
            minorPath.style.filter = "brightness(1.1) drop-shadow(0px 0px 4px rgba(0,0,0,0.25))";
            textMinor.setAttribute("opacity", "1.0");
            if (romanTextMinor) romanTextMinor.setAttribute("opacity", "1.0");
        });
        minorG.addEventListener('mouseleave', () => {
            minorPath.setAttribute("opacity", defaultOpacityMinor);
            minorPath.style.filter = "none";
            textMinor.setAttribute("opacity", defaultOpacityMinor);
            if (romanTextMinor) romanTextMinor.setAttribute("opacity", defaultOpacityMinor);
        });

        minorG.appendChild(minorPath);
        minorG.appendChild(textMinor);
        if (romanTextMinor) minorG.appendChild(romanTextMinor);
        svg.appendChild(minorG);
    });

    // ── Centre white circle ──────────────────────────────────────────────────
    const centerCircle = document.createElementNS(svgNS, "circle");
    centerCircle.setAttribute("cx", cx);
    centerCircle.setAttribute("cy", cy);
    centerCircle.setAttribute("r", rInMinor);
    centerCircle.setAttribute("fill", "white");
    centerCircle.setAttribute("stroke", "#e2e8f0");
    centerCircle.setAttribute("stroke-width", "1");
    svg.appendChild(centerCircle);

    // Centre labels
    const textCenter1 = document.createElementNS(svgNS, "text");
    textCenter1.setAttribute("x", cx);
    textCenter1.setAttribute("y", cy - 18);
    textCenter1.setAttribute("text-anchor", "middle");
    textCenter1.setAttribute("fill", "#64748b");
    textCenter1.setAttribute("font-size", "9");
    textCenter1.setAttribute("font-weight", "800");
    textCenter1.setAttribute("font-family", "'Inter', sans-serif");
    textCenter1.setAttribute("letter-spacing", "0.05em");
    textCenter1.textContent = "MAJOR";
    svg.appendChild(textCenter1);

    const textCenter2 = document.createElementNS(svgNS, "text");
    textCenter2.setAttribute("x", cx);
    textCenter2.setAttribute("y", cy + 4);
    textCenter2.setAttribute("text-anchor", "middle");
    textCenter2.setAttribute("fill", "#94a3b8");
    textCenter2.setAttribute("font-size", "7.5");
    textCenter2.setAttribute("font-weight", "700");
    textCenter2.setAttribute("font-family", "'Inter', sans-serif");
    textCenter2.setAttribute("letter-spacing", "0.02em");
    textCenter2.textContent = "RELATIVE";
    svg.appendChild(textCenter2);

    const textCenter3 = document.createElementNS(svgNS, "text");
    textCenter3.setAttribute("x", cx);
    textCenter3.setAttribute("y", cy + 14);
    textCenter3.setAttribute("text-anchor", "middle");
    textCenter3.setAttribute("fill", "#94a3b8");
    textCenter3.setAttribute("font-size", "7.5");
    textCenter3.setAttribute("font-weight", "700");
    textCenter3.setAttribute("font-family", "'Inter', sans-serif");
    textCenter3.setAttribute("letter-spacing", "0.02em");
    textCenter3.textContent = "MINOR";
    svg.appendChild(textCenter3);

    // "hold 2s = set key" hint (only when no key is set and callback is provided)
    if (!hasKey && typeof onKeySelected === 'function') {
        const hintText = document.createElementNS(svgNS, "text");
        hintText.setAttribute("x", cx);
        hintText.setAttribute("y", cy + 30);
        hintText.setAttribute("text-anchor", "middle");
        hintText.setAttribute("fill", "#94a3b8");
        hintText.setAttribute("font-size", "6");
        hintText.setAttribute("font-weight", "600");
        hintText.setAttribute("font-family", "'Inter', sans-serif");
        hintText.style.pointerEvents = "none";
        hintText.textContent = "hold 2s = set key";
        svg.appendChild(hintText);
    }

    // ── Key highlight outline (only when a key is set) ───────────────────────
    if (highlightPathD) {
        const outlineOuter = document.createElementNS(svgNS, "path");
        outlineOuter.setAttribute("d", highlightPathD);
        outlineOuter.setAttribute("fill", "none");
        outlineOuter.setAttribute("stroke", "#0f172a");
        outlineOuter.setAttribute("stroke-width", "5.5");
        outlineOuter.setAttribute("stroke-linejoin", "round");
        outlineOuter.style.pointerEvents = "none";
        svg.appendChild(outlineOuter);

        const outlineInner = document.createElementNS(svgNS, "path");
        outlineInner.setAttribute("d", highlightPathD);
        outlineInner.setAttribute("fill", "none");
        outlineInner.setAttribute("stroke", "#ffffff");
        outlineInner.setAttribute("stroke-width", "2");
        outlineInner.setAttribute("stroke-linejoin", "round");
        outlineInner.style.pointerEvents = "none";
        svg.appendChild(outlineInner);
    }

    container.appendChild(svg);
}
