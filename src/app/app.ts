import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideCheck, lucideBan } from '@ng-icons/lucide';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCard } from '../../libs/ui/card/src';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

@Component({
  imports: [
    RouterOutlet
],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  
}
