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
          });
      });

    // Output folder picker (text input only)
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