import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { ConfigSchema, type Config } from './schema.js';

export class ConfigLoader {
  static async load(configPath: string = 'lint-ui.yml'): Promise<Config> {
    const fullPath = path.resolve(process.cwd(), configPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Config file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const rawConfig = YAML.parse(content);

    try {
      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  static getDefaultConfig(): string {
    return `baseUrl: http://localhost:4173

routes:
  - path: /
    name: home
  - path: /dashboard
    name: dashboard
  - path: /settings
    name: settings

breakpoints:
  - name: mobile
    width: 375
    height: 812
  - name: tablet
    width: 768
    height: 1024
  - name: desktop
    width: 1280
    height: 800
  - name: large
    width: 1440
    height: 900

variants:
  theme: [light, dark]

thresholds:
  pixelDiffThreshold: 0.1
  layoutShiftThreshold: 0.1

rules:
  checkOverflow: true
  checkClipping: true
  checkAccessibility: true
  checkContrast: true

disableAnimations: true
readySelector: '[data-ui-ready="true"]'
outputDir: .lint-ui
baselineDir: .ui-baseline
`;
  }
}
