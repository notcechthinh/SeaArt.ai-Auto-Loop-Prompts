# SeaArt.ai-Auto-Loop-Prompts
Run multiple prompts automatically on SeaArt with ease
## Features
- Multi-Prompt Loop: Loop through multiple prompts automatically.
- Expand Editor: Click a button to open a larger editor for any prompt.
- Max Loop: Limit the number of loops to prevent endless running.
- Auto-Scroll: Automatically scrolls the message container while generating.
- Auto-Skip: Automatically skips prompts that are stuck at 98% or canceled by the system.
## Installation
1. Install a userscript manager in your browser, such as Tampermonkey or Violentmonkey.
2. Create a new userscript and paste the script code into it.
3. Save and enable the script.
4. Visit SeaArt.ai, and the script will inject its UI. Initially, only the expand button will be visible in the bottom-right corner. Click it to open the prompt panel.
## Usage
1. Click the **expand button** to open the prompt panel.
2. Add your prompts and set the number of times to run each.
3. Set a **max loop** count if desired.
4. Click **Start** to begin looping through prompts.
5. While running:
   - The **current prompt** is highlighted.
   - Progress is shown for each prompt, which is useless xD.
   - If a prompt gets stuck at 98% or is canceled, it will **auto-skip** and continue.
6. Click **Stop** to pause or stop the loop.
7. You can edit prompts in the expanded editor and press **Enter** or click **Save** to update.

