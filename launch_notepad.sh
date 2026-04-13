#!/bin/bash

# 1. Start the HTTP server silently in the background
if ! pgrep -f "http.server 8080" > /dev/null; then
    cd /home/ramnhell/.gemini/antigravity/scratch/nova_game/
    nohup python3 -m http.server 8080 </dev/null &>/dev/null &
    disown
fi

# 2. Launch Brave in App Mode silently
nohup brave-browser --app=http://localhost:8080/NOTEPAD.html --class="ChronicleNotepad" </dev/null &>/dev/null &
disown

# 3. Wait for the window to appear
sleep 3

# 4. Attempt to position the window at Bottom Left (25%)
# Note: This assumes a standard 1080p layout. Adjusting to be safe.
# If wmctrl is present, we move it to x=0, y=540 (half height) and resize to 480x540
if command -v wmctrl &> /dev/null; then
    wmctrl -x -r "ChronicleNotepad" -e 0,0,540,480,540
fi
