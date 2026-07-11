import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiChatDrawer } from '../../features/ai/ai-chat-drawer';
import { MessagesPanel } from '../../features/ai/messages-panel';
import { UtilityPanel } from '../../features/ai/utility-panel';
import { CreateDrawer } from '../../features/create/create-drawer';
import { ToastOutlet } from '../../shared/ui';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { UiStateStore } from '../ui-state.store';

/**
 * App shell (requirements §6): persistent three-zone sidebar + light header
 * wrapping the routed content. The sidebar is fixed on desktop and becomes an
 * off-canvas drawer (<1024). RTL mirrors the whole shell via `dir` on <html>.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, Header, ToastOutlet, AiChatDrawer, UtilityPanel, MessagesPanel, CreateDrawer],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly ui = inject(UiStateStore);
  protected readonly mobileNavOpen = this.ui.mobileNavOpen;

  protected closeMobileNav(): void {
    this.ui.toggleMobileNav(false);
  }
}
