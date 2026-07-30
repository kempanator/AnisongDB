import { AfterViewInit, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';
import { SettingsTabRegistryService } from './settings-tab-registry.service';

@Directive({
  selector: '[settingsTabPanel]',
})
export class SettingsTabPanelDirective implements AfterViewInit, OnDestroy {
  readonly settingsTabPanel = input.required<string>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly tabRegistry = inject(SettingsTabRegistryService);

  ngAfterViewInit(): void {
    this.tabRegistry.mountTabPanel(this.settingsTabPanel(), this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.tabRegistry.unmountTabPanel(this.elementRef.nativeElement);
  }
}
