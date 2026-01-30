$file = "styles.css"
$newContent = @"

@media (max-width: 480px) {
    .ability-star svg {
        pointer-events: none !important;
    }
}

/* Piano Chord Overlay Styles - Selector Polish */
.piano-chord-header .header-main { 
    display: flex; 
    align-items: center; 
    gap: clamp(8px, 1.5vw, 15px); 
    flex: 1;
    justify-content: flex-end;
    margin-right: 15px;
}

.piano-chord-header h3 {
    margin-right: auto !important;
    font-size: clamp(1.1em, 2vw, 1.4em) !important;
    white-space: nowrap;
}

.sound-selector-wrapper { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    background: rgba(255, 255, 255, 0.15); 
    padding: 4px 10px; 
    border-radius: 20px; 
    border: 1px solid rgba(255, 255, 255, 0.25); 
    transition: all 0.2s ease;
}

.sound-selector-wrapper:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.4);
}

.piano-sound-selector { 
    background: transparent; 
    border: none; 
    font-size: 0.8em; 
    font-weight: 600; 
    cursor: pointer; 
    outline: none; 
    color: white; 
}

.piano-sound-selector option { 
    background: #764ba2; 
    color: white; 
}

.sound-icon { 
    font-size: 1.1em; 
}
"@
Add-Content $file $newContent
