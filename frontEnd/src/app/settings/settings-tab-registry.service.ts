import {
  afterRenderEffect,
  computed,
  Directive,
  ElementRef,
  inject,
  Injectable,
  input,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';

export type SettingsTabCleanup = () => void;
export type SettingsTabRender = (panel: HTMLElement) => void | SettingsTabCleanup;

export interface SettingsTabDefinition {
  readonly id: string;
  readonly label: string;
  readonly render: SettingsTabRender;
}

const BUILT_IN_TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'info', label: 'Info' },
] as const;

@Injectable({ providedIn: 'root' })
export class SettingsTabRegistryService {
  readonly builtInTabs = BUILT_IN_TABS;
  private readonly registeredTabs = signal<SettingsTabDefinition[]>([]);
  readonly extensionTabs = this.registeredTabs.asReadonly();
  readonly tabs = computed(() => [...this.builtInTabs, ...this.extensionTabs()]);
  private readonly activeTabState = signal<string>('settings');
  readonly activeTab = this.activeTabState.asReadonly();
  private mountedPanel: {
    element: HTMLElement;
    definition: SettingsTabDefinition;
    cleanup?: SettingsTabCleanup;
  } | null = null;

  setActiveTab(id: string): void {
    if (this.tabs().some((tab) => tab.id === id)) {
      this.activeTabState.set(id);
    }
  }

  resetActiveTab(): void {
    this.activeTabState.set('settings');
  }

  registerTab(definition: SettingsTabDefinition): SettingsTabCleanup {
    this.validateDefinition(definition);

    if (this.builtInTabs.some((tab) => tab.id === definition.id)) {
      throw new Error(`The settings tab id "${definition.id}" is reserved.`);
    }
    if (this.registeredTabs().some((tab) => tab.id === definition.id)) {
      throw new Error(`A settings tab with id "${definition.id}" is already registered.`);
    }

    const registeredTab = { ...definition };
    this.registeredTabs.update((tabs) => [...tabs, registeredTab]);
    return () => this.unregisterTab(registeredTab);
  }

  mountTabPanel(id: string, panel: HTMLElement): void {
    this.unmountCurrentPanel();

    const definition = this.registeredTabs().find((tab) => tab.id === id);
    if (!definition) return;

    try {
      const cleanup = definition.render(panel);
      this.mountedPanel = {
        element: panel,
        definition,
        cleanup: typeof cleanup === 'function' ? cleanup : undefined,
      };
    } catch (error) {
      panel.replaceChildren();
      console.error(`Could not render settings tab "${id}".`, error);
    }
  }

  unmountTabPanel(panel: HTMLElement): void {
    if (this.mountedPanel?.element !== panel) return;
    this.unmountCurrentPanel();
  }

  private unmountCurrentPanel(): void {
    const mountedPanel = this.mountedPanel;
    if (!mountedPanel) return;

    try {
      mountedPanel.cleanup?.();
    } catch (error) {
      console.error(`Could not clean up settings tab "${mountedPanel.definition.id}".`, error);
    }
    mountedPanel.element.replaceChildren();
    this.mountedPanel = null;
  }

  private unregisterTab(definition: SettingsTabDefinition): void {
    if (!this.registeredTabs().includes(definition)) return;

    this.registeredTabs.update((tabs) => tabs.filter((tab) => tab !== definition));

    if (this.mountedPanel?.definition === definition) {
      this.unmountCurrentPanel();
    }

    if (this.activeTab() === definition.id) {
      this.activeTabState.set('settings');
    }
  }

  private validateDefinition(definition: SettingsTabDefinition): void {
    if (!definition || typeof definition !== 'object') {
      throw new TypeError('A settings tab definition is required.');
    }
    if (typeof definition.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(definition.id)) {
      throw new TypeError('Settings tab ids must start with a letter and contain only lowercase letters, numbers, and hyphens.');
    }
    if (typeof definition.label !== 'string' || !definition.label.trim()) {
      throw new TypeError('Settings tab labels cannot be empty.');
    }
    if (typeof definition.render !== 'function') {
      throw new TypeError('Settings tab render must be a function.');
    }
  }
}

@Directive({
  selector: '[settingsTabPanel]',
})
export class SettingsTabPanelDirective implements OnDestroy {
  readonly settingsTabPanel = input.required<string>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly tabRegistry = inject(SettingsTabRegistryService);

  constructor() {
    afterRenderEffect(() => {
      const tabId = this.settingsTabPanel();
      untracked(() => {
        this.tabRegistry.mountTabPanel(tabId, this.elementRef.nativeElement);
      });
    });
  }

  ngOnDestroy(): void {
    this.tabRegistry.unmountTabPanel(this.elementRef.nativeElement);
  }
}
