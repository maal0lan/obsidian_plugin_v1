# Testing Guide for Obsidian Sample Plugin with Markdown to HTML Conversion md2html

## Prerequisites

1. **Python must be installed and available in your PATH**
   - To verify: Open a terminal/command prompt and run `python --version` or `python3 --version`
   - If you get an error, install Python from https://www.python.org/downloads/
   - On Windows, make sure to check "Add Python to PATH" during installation

2. **Obsidian Developer Mode enabled**
   - Settings → About → Toggle "Developer mode" ON

## Installation

1. The plugin should already be built (you just ran `npm run build` successfully)
2. In Obsidian:
   - Settings → Community plugins
   - Click "Open plugins folder"
   - Verify you see the `obsidian-sample-plugin` folder
   - Go back to Community plugins
   - Toggle "Sample Plugin" ON

## Testing Steps

### 1. Basic Conversion Test

1. Open any Markdown note in your vault (or create a new one)
2. run `npm run dev ` on the plugin before opening the folder forgot to say it before (for testing purpose bro aparum adhu ae varum)
3. Press `Ctrl+P` to open the command palette
4. Type "Convert current Markdown to HTML" and select it
5. You should see a notice like: 📄 Exported to HTML: [path/to/your/file.html]

### 2. Verify Output

1. Check that an HTML file was created:
   - If you didn't set an export folder: same folder as your Markdown file
   - If you set an export folder: in that specified folder this one works well bro we can add in pipline later for vercel deployments.
2. Open the HTML file in a web browser to verify:
   - The Markdown was converted correctly
   - The selected theme (light/dark/blue) is applied

### 3. Test Settings

1. Go to Obsidian Settings → "Sample Plugin" in the left sidebar
2. Try changing:
   - Export Theme (Light/Dark/Blue)
   - Export Folder (leave empty or set a path)
3. Close settings and run the conversion command again
4. Verify the output reflects your changes

### 4. Test Error Handling

1. Try running the command when no Markdown file is open
2. You should see: "Please open a Markdown file first."
3. Try renaming or deleting `md2html.py` temporarily
4. Run the command and check for appropriate error notice

## Expected Behavior

### Success Case
- Notice: 📄 Exported to HTML: [full/path/to/file.html]
- HTML file created in specified location
- File contains properly formatted HTML with selected theme CSS

### Error Cases
- No Markdown open: "Please open a Markdown file first."
- Python not found: "❌ Error spawning Python: [error details]"
- Conversion fails: "❌ Conversion failed (code [number]). See console for details."

## Configuration

Settings are stored in:
`.obsidian/plugins/obsidian-sample-plugin/data.json`

Example:
```json
{
  "exportTheme": "dark",
  "exportPath": "D:/MyExports"
}
```

## Troubleshooting

### "Spawn python ENOENT" Error
This means Python wasn't found in your system PATH. Solutions:
1. Install Python from https://www.python.org/downloads/
2. On Windows, reinstall and check "Add Python to PATH"
3. On Mac/Linux, ensure python3 is installed and in PATH
4. Restart Obsidian after installing Python

### No Notice Appears
1. Open DevTools in Obsidian (`Ctrl+Shift+I` or `Cmd+Option+I`)
2. Check the Console tab for error messages
3. Verify the plugin is enabled in Community plugins

### HTML File Not Created
1. Check the notice for the output path
2. Verify that folder exists and is writable
3. Check Console for any Python script errors

## Notes

- The plugin uses your system's Python installation
- First run may take a moment as it locates the Python executable
- Subsequent conversions should be faster
- The plugin works with any valid Markdown file
- HTML output includes full HTML document with embedded CSS theme

Enjoy converting your Markdown notes to beautiful HTML files! 🚀
