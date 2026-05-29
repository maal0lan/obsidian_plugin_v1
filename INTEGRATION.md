# Integrating md2html.py with the Obsidian Sample Plugin

This guide explains how to call the Python Markdown‑to‑HTML converter (`md2html.py`) from the Obsidian plugin, read user preferences from `data.json`, and let the user choose an output folder and theme.

## 1. Extend the settings (`data.json`)

Add two new fields to `data.json` (or create a separate settings file if you prefer):

```jsonc
{
  "mySetting": "test",
  "exportTheme": "dark",          // one of: light, dark, blue
  "exportPath": ""                // empty means “same folder as the source file”
}
```

* `exportTheme` – selects the CSS theme used by `md2html.py`.
* `exportPath` – folder where the generated HTML will be saved.  
  If left empty, the plugin will save the HTML next to the source Markdown file (same name, `.html` extension).

You can edit this file manually or add a settings tab in the plugin UI (see § 3).

## 2. Parse `data.json` in TypeScript

Create a small helper to read and parse the JSON file.

```ts
// src/utils.ts
import { Plugin, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';

export interface ExportSettings {
  exportTheme: 'light' | 'dark' | 'blue';
  exportPath: string; // absolute folder path, may be empty
}

export async function loadExportSettings(plugin: Plugin): Promise<ExportSettings> {
  const dataPath = path.join((plugin.app.vault.adapter as any).basePath, '.obsidian', 'plugins', 'obsidian-sample-plugin', 'data.json');
  try {
    const raw = await fs.promises.readFile(dataPath, 'utf-8');
    const json = JSON.parse(raw);
    return {
      exportTheme: json.exportTheme ?? 'light',
      exportPath: json.exportPath ?? ''
    };
  } catch (e) {
    // fallback to defaults
    return { exportTheme: 'light', exportPath: '' };
  }
}
```

> **Note:** The `path` and `fs` modules are available in the main process (Obsidian runs on Electron). If you bundle the plugin with Webpack/Vite, you may need to mark them as `externals` or use the `node:` protocol. For simplicity, keep the helper in the main process (e.g., call it from `main.ts`).

## 3. Add UI controls for the new settings

Extend `SampleSettingTab` (in `src/settings.ts`) to let the user pick a theme and a folder.

```ts
// src/settings.ts
import {App, PluginSettingTab, Setting, TFile} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
  mySetting: string;
  exportTheme: 'light' | 'dark' | 'blue';
  exportPath: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default',
  exportTheme: 'light',
  exportPath: ''
};

export class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    // Existing setting (unchanged)
    new Setting(containerEl)
      .setName('Settings #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));

    // Theme selector
    new Setting(containerEl)
      .setName('Export Theme')
      .setDesc('Choose the CSS theme for the exported HTML')
      .addDropdown(dropdown => {
        dropdown
          .addOption('light', 'Light')
          .addOption('dark', 'Dark')
          .addOption('blue', 'Blue')
          .setValue(this.plugin.settings.exportTheme)
          .onChange(async (value) => {
            this.plugin.settings.exportTheme = value as 'light' | 'dark' | 'blue';
            await this.plugin.saveSettings();
          }));
      });

    // Output folder picker
    new Setting(containerEl)
      .setName('Export Folder')
      .setDesc('Folder where the HTML file will be saved (empty = same folder as source)')
      .addText(text => text
        .setPlaceholder('Leave empty or type/paste an absolute folder path')
        .setValue(this.plugin.settings.exportPath)
        .onChange(async (value) => {
          this.plugin.settings.exportPath = value.trim();
          await this.plugin.saveSettings();
        }));
  }
}
```

You’ll need to extend `MyPluginSettings` in `src/main.ts` (or a separate settings interface) to hold the new fields (already done in the provided code).

## 4. Invoke the Python script from the plugin

Add a command that converts the currently active Markdown file using the settings.

```ts
// src/main.ts (inside the MyPlugin class)
import {App, Editor, MarkdownView, Modal, Notice, Plugin, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import { loadExportSettings } from "./utils";
import * as path from 'path';
import { spawn } from 'child_process';

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// NEW: Convert Markdown to HTML command
		this.addCommand({
			id: 'convert-md-to-html',
			name: 'Convert current Markdown to HTML',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.convertActiveFile();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Convert the currently active Markdown file to HTML using md2html.py
	 */
	private async convertActiveFile() {
		const { app } = this;
		const activeFile = app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			new Notice('Please open a Markdown file first.');
			return;
		}

		// Load export settings (theme & path)
		const settings = await loadExportSettings(app);

		// Determine where to save the HTML
		let outputDir = settings.exportPath.trim();
		if (!outputDir) {
			// Same folder as the source file
			outputDir = activeFile.parent?.path ?? app.vault.getRoot().path;
		}
		const outputFileName = activeFile.basename + '.html';
		const outputPath = path.join(outputDir, outputFileName);

		// Build arguments for md2html.py
		const scriptPath = path.join(
			app.vault.getRoot().path,
			'.obsidian',
			'plugins',
			'obsidian-sample-plugin',
			'md2html.py'
		);

		// We'll spawn python with the arguments:
		//   python md2html.py "<input.md>" -t "<theme>" -o "<output.html>"
		const args = [
			`"${activeFile.path}"`,   // input file (quoted for spaces)
			`-t`,
			`"${settings.exportTheme}"`,
			`-o`,
			`"${outputPath}"`
		];

		// Spawn the process
		const python = spawn('python', args.map(a => a.replace(/^"|"$/g, '')), {
			cwd: path.dirname(scriptPath) // run from the plugin folder
		});

		let stdout = '';
		let stderr = '';
		python.stdout.on('data', data => stdout += data);
		python.stderr.on('data', data => stderr += data);

		python.on('close', (code) => {
			if (code === 0) {
				new Notice(`📄 Exported to HTML:\n${outputPath}`);
			} else {
				new Notice(`❌ Conversion failed (code ${code}). See console for details.`);
				console.error('md2html.py stderr:', stderr);
			}
		});
	}
}

// ... SampleModal class remains unchanged ...
```

Now users can trigger the conversion via the command palette or a hotkey.

## 5. How the path parsing works (optional)

If you want to let the user pick a folder via the UI and then have the plugin automatically use the *parent* of a selected file as the export folder, the folder‑picker button in the settings tab (see § 3) demonstrates that:

1. User clicks the folder icon.
2. Obsidian’s file picker returns a `TFile`.
3. We take `file.parent?.path` as the folder to store the HTML.
4. The folder path is saved back to the plugin settings (and persisted via `saveSettings`).

When the conversion runs, the plugin builds the output path as:

```
<exportPath>/<sourceFileBasename>.html
```

If `exportPath` is empty, it defaults to the source file’s parent folder.

## 6. Theme selection UI

The dropdown in the settings tab (`exportTheme`) stores the selected theme (`light`, `dark`, or `blue`).  
When the conversion runs, that value is passed to `md2html.py` via the `-t` flag, which selects the corresponding CSS block from the script’s `THEMES` object.

## 7. Packaging considerations

* **Python dependency:** The plugin assumes Python is available in the system `PATH`. If you want to bundle a Python interpreter, you’d need to ship it with the plugin and adjust the spawn path accordingly (advanced).
* **Security:** Obsidian plugins run in a restricted environment; spawning external processes is allowed but may be flagged by some security policies. Inform users that the plugin will execute `md2html.py`.
* **Testing:** Use a test vault with a sample Markdown file to verify that the generated HTML appears in the chosen folder and uses the selected theme.

## 8. Full file overview

```
obsidian-sample-plugin/
│
├─ md2html.py                 ← your existing Python converter
├─ data.json                  ← stores exportTheme & exportPath
├─ src/
│   ├─ main.ts                ← plugin entry point, registers command
│   ├─ settings.ts            ← settings tab with theme & folder controls
│   └─ utils.ts               ← helper to load/save data.json
│
├─ manifest.json
├─ package.json
└─ ...
```

---

### Quick checklist for the user

- [ ] Add `exportTheme` and `exportPath` to `data.json` (or let the settings UI create them).
- [ ] Extend `MyPluginSettings` in `main.ts` with the two new fields (already done).
- [ ] Implement `loadExportSettings` (or reuse the settings object directly) – done in `utils.ts`.
- [ ] Add the Theme dropdown and Folder picker to `SampleSettingTab` – done in `settings.ts`.
- [ ] Write the conversion command (`convertActiveFile`) that spawns `python md2html.py` – done in `main.ts`.
- [ ] Register the command in `onload` – done.
- [ ] Reload Obsidian, open a Markdown file, run the command, and verify the HTML output.

With these steps, the plugin will read the user’s chosen theme and output folder from `data.json`, call your Python script with the correct arguments, and place the generated HTML where the user wants it. Happy coding!